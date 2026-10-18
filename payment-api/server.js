import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { priceCart } from "./catalog.js";
import { readFile } from "node:fs/promises";
import { EnquiryStore, CONSENT_VERSION, secretMatches } from "./enquiry-store.js";

const PORT = Number(process.env.PORT || 10000);
const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const ENQUIRY_ADMIN_TOKEN = process.env.ENQUIRY_ADMIN_TOKEN || "";
let enquiryStore = null;
let enquiriesReady = false;
if (process.env.ENQUIRY_DATA_DIR && ENQUIRY_ADMIN_TOKEN.length >= 32) {
  try { enquiryStore = new EnquiryStore(process.env.ENQUIRY_DATA_DIR); await enquiryStore.ready(); enquiriesReady = true; }
  catch { console.error("Enquiry storage unavailable. Check the persistent disk configuration."); }
}
const enquiryLimits = new Map();
function enquiryRateLimited(req, res) {
  const key = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  for (const [ip, value] of enquiryLimits) if (value.until <= now) enquiryLimits.delete(ip);
  const value = enquiryLimits.get(key) || { count: 0, until: now + 60_000 };
  value.count++;
  enquiryLimits.set(key, value);
  if (value.count <= 120) return false;
  res.setHeader("retry-after", "60");
  send(res, 429, { error: "Please wait a minute and try again." });
  return true;
}
const SITE_ORIGINS = new Set(
  (process.env.SITE_ORIGINS || "https://nandinigift.in,https://www.nandinigift.in")
    .split(",").map((origin) => origin.trim()).filter(Boolean),
);
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const WHATSAPP_RECIPIENT = (process.env.WHATSAPP_RECIPIENT || "918266814556").replace(/\D/g, "");
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || "";
const WHATSAPP_TEMPLATE_LANGUAGE = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en";
const WHATSAPP_GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || "";
const whatsappNotificationsSent = new Set();

async function sendWhatsAppOrderNotification(order, payment, lines) {
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN || !WHATSAPP_TEMPLATE_NAME || !WHATSAPP_GRAPH_API_VERSION || !WHATSAPP_RECIPIENT) return false;
  if (whatsappNotificationsSent.has(payment.id)) return true;
  const notes = order.notes || {};
  const productLines = lines.map((line) => `• ${line.name} × ${line.quantity} = ₹${line.unitPrice * line.quantity}`).join("\n");
  const templateParameters = [
    order.id,
    payment.id,
    `₹${(payment.amount / 100).toFixed(2)}`,
    productLines,
    notes.customer_name || "Not provided",
    notes.customer_mobile || "Not provided",
    notes.delivery_address || "Not provided",
    notes.delivery_pin_code || "Not provided",
  ].map((text) => ({ type: "text", text: String(text) }));
  try {
    const response = await fetch(`https://graph.facebook.com/${encodeURIComponent(WHATSAPP_GRAPH_API_VERSION)}/${encodeURIComponent(WHATSAPP_PHONE_NUMBER_ID)}/messages`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: WHATSAPP_RECIPIENT,
        type: "template",
        template: {
          name: WHATSAPP_TEMPLATE_NAME,
          language: { code: WHATSAPP_TEMPLATE_LANGUAGE },
          components: [{ type: "body", parameters: templateParameters }],
        },
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      console.warn("WhatsApp order notification failed with HTTP", response.status);
      return false;
    }
    whatsappNotificationsSent.add(payment.id);
    if (whatsappNotificationsSent.size > 5000) whatsappNotificationsSent.delete(whatsappNotificationsSent.values().next().value);
    return true;
  } catch {
    console.warn("WhatsApp order notification could not be sent.");
    return false;
  }
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    let tooLarge = false;
    req.on("data", (chunk) => {
      if (tooLarge) return;
      data += chunk;
      if (Buffer.byteLength(data) > 16_384) { tooLarge = true; data = ""; reject(new Error("Request is too large.")); }
    });
    req.on("end", () => {
      if (tooLarge) return;
      try { resolve(JSON.parse(data || "{}")); } catch { reject(new Error("Invalid JSON.")); }
    });
    req.on("error", reject);
  });
}

async function razorpay(path, options = {}) {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      authorization: `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}`,
      "content-type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(12_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.description || "Razorpay could not complete the request.");
    error.status = response.status;
    throw error;
  }
  return body;
}

export function verifyCheckoutSignature(orderId, paymentId, signature) {
  if (!KEY_SECRET || typeof orderId !== "string" || typeof paymentId !== "string" || typeof signature !== "string") return false;
  const expected = createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest();
  let received;
  try { received = Buffer.from(signature, "hex"); } catch { return false; }
  return received.length === expected.length && timingSafeEqual(expected, received);
}

export const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && SITE_ORIGINS.has(origin)) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "Origin");
    res.setHeader("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type, authorization");
  }
  if (req.method === "OPTIONS") return res.writeHead(204).end();

  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/health") return send(res, 200, { ok: true });
  if (req.method === "GET" && url.pathname === "/api/config") {
    return send(res, 200, { enabled: Boolean(KEY_ID && KEY_SECRET), keyId: KEY_ID || null, enquiriesEnabled: enquiriesReady, consentVersion: CONSENT_VERSION });
  }
  if (req.method === "GET" && url.pathname === "/enquiries") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" });
    return res.end(await readFile(new URL("./enquiries.html", import.meta.url)));
  }
  if (req.method === "GET" && ["/enquiries.js", "/enquiries.css"].includes(url.pathname)) {
    res.writeHead(200, { "content-type": url.pathname.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/css; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
    return res.end(await readFile(new URL(`.${url.pathname}`, import.meta.url)));
  }
  if (url.pathname.startsWith("/api/enquiries") || url.pathname.startsWith("/api/admin/enquiries")) {
    if (!enquiriesReady) return send(res, 503, { error: "Gift enquiries are not available yet." });
    if (origin && !SITE_ORIGINS.has(origin) && origin !== `https://${req.headers.host}`) return send(res, 403, { error: "Origin not allowed." });
    if (enquiryRateLimited(req, res)) return;
    try {
      if (url.pathname.startsWith("/api/admin/enquiries")) {
        const supplied = (req.headers.authorization || "").replace(/^Bearer /, "");
        if (!secretMatches(supplied, ENQUIRY_ADMIN_TOKEN)) return send(res, 401, { error: "Enter the correct owner access password." });
        if (req.method === "GET" && url.pathname === "/api/admin/enquiries") return send(res, 200, { enquiries: await enquiryStore.list() });
        const match = url.pathname.match(/^\/api\/admin\/enquiries\/([a-f0-9-]{36})$/);
        if (req.method === "DELETE" && match) return send(res, 200, { deleted: await enquiryStore.remove(match[1]) });
      } else if (req.method === "POST" && url.pathname === "/api/enquiries") {
        const body = await readJson(req);
        if (body.consent !== true || body.consentVersion !== CONSENT_VERSION) return send(res, 400, { error: "Optional enquiry permission is required." });
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const mobile = typeof body.mobile === "string" ? body.mobile.replace(/\D/g, "") : "";
        if (!name || name.length > 80 || !/^[6-9]\d{9}$/.test(mobile)) return send(res, 400, { error: "Enter your name and a valid Indian mobile number." });
        const { lines, amount } = priceCart(body.items);
        return send(res, 201, { saved: true, ...await enquiryStore.create({ name, mobile, lines, amount }) });
      } else {
        const match = url.pathname.match(/^\/api\/enquiries\/([a-f0-9-]{36})\/withdraw$/);
        if (req.method === "POST" && match) {
          const body = await readJson(req);
          if (typeof body.token !== "string" || body.token.length !== 64) return send(res, 400, { error: "Invalid enquiry reference." });
          const withdrawn = await enquiryStore.withdraw(match[1], body.token);
          return send(res, withdrawn ? 200 : 404, { withdrawn });
        }
      }
      return send(res, 404, { error: "Not found." });
    } catch (error) {
      const invalid = /Cart|Choose|JSON|large/.test(error.message);
      return send(res, invalid ? 400 : 503, { error: invalid ? error.message : "Could not save the enquiry. Please try again." });
    }
  }
  if (!KEY_ID || !KEY_SECRET) return send(res, 503, { error: "Online payment is not configured yet." });

  if (req.method === "POST" && url.pathname === "/api/razorpay/order") {
    try {
      const body = await readJson(req);
      const { lines, amount } = priceCart(body.items);
      const pinCode = typeof body.pinCode === "string" ? body.pinCode.replace(/\D/g, "").slice(0, 6) : "";
      const customer = body.deliveryDetails && typeof body.deliveryDetails === "object" ? body.deliveryDetails : {};
      const customerName = typeof customer.name === "string" ? customer.name.trim().slice(0, 80) : "";
      const customerMobile = typeof customer.mobile === "string" ? customer.mobile.replace(/\D/g, "").slice(0, 10) : "";
      const deliveryAddress = typeof customer.address === "string" ? customer.address.trim().slice(0, 256) : "";
      if (!/^\d{6}$/.test(pinCode)) return send(res, 400, { error: "Enter a valid 6-digit delivery PIN code." });
      if (!customerName) return send(res, 400, { error: "Enter the customer name." });
      if (!/^[6-9]\d{9}$/.test(customerMobile)) return send(res, 400, { error: "Enter a valid 10-digit Indian mobile number." });
      if (deliveryAddress.length < 10) return send(res, 400, { error: "Enter the complete delivery address." });
      const order = await razorpay("/orders", {
        method: "POST",
        body: JSON.stringify({
          amount: amount * 100,
          currency: "INR",
          receipt: `ngc_${randomUUID().replaceAll("-", "").slice(0, 24)}`,
          notes: {
            product_items: lines.map(({ id, quantity }) => `${id}:${quantity}`).join(","),
            customer_name: customerName,
            customer_mobile: customerMobile,
            delivery_address: deliveryAddress,
            delivery_pin_code: pinCode,
            delivery_charge: "not-included; confirm separately on WhatsApp",
          },
        }),
      });
      if (enquiriesReady && body.enquiry) {
        try { await enquiryStore.attach(body.enquiry, order.id, { name: customerName, mobile: customerMobile }); }
        catch { console.warn("Could not link the consented enquiry to its order."); }
      }
      return send(res, 200, { orderId: order.id, amount: order.amount, currency: order.currency, keyId: KEY_ID });
    } catch (error) {
      return send(res, error.message.includes("Cart") || error.message.includes("Choose") ? 400 : 502, { error: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/razorpay/verify") {
    try {
      const body = await readJson(req);
      const { orderId, paymentId, signature, items } = body;
      if (!verifyCheckoutSignature(orderId, paymentId, signature)) return send(res, 400, { verified: false, error: "Payment verification failed." });
      const { amount } = priceCart(items);
      const [order, payment] = await Promise.all([
        razorpay(`/orders/${encodeURIComponent(orderId)}`),
        razorpay(`/payments/${encodeURIComponent(paymentId)}`),
      ]);
      const storedItems = typeof order.notes?.product_items === "string"
        ? order.notes.product_items.split(",").filter(Boolean).map((entry) => {
          const [id, quantity] = entry.split(":");
          return { id, quantity: Number(quantity) };
        })
        : [];
      const { lines: orderLines, amount: orderAmount } = priceCart(storedItems);
      if (payment.order_id !== orderId || orderAmount !== amount || order.amount !== orderAmount * 100 || payment.amount !== order.amount || payment.currency !== "INR") {
        return send(res, 400, { verified: false, error: "Payment details do not match this cart." });
      }
      if (payment.status !== "captured") {
        return send(res, 202, { verified: false, pending: true, error: "Payment is authorised and awaiting capture. Please contact the shop before retrying." });
      }
      if (enquiriesReady) {
        try { await enquiryStore.paid(orderId); }
        catch { console.warn("Could not update the enquiry payment status."); }
      }
      const whatsappNotificationSent = await sendWhatsAppOrderNotification(order, payment, orderLines);
      return send(res, 200, { verified: true, paymentId: payment.id, status: payment.status, whatsappNotificationSent });
    } catch (error) {
      return send(res, error.message.includes("Cart") || error.message.includes("Choose") ? 400 : 502, { verified: false, error: error.message });
    }
  }

  return send(res, 404, { error: "Not found." });
});

if (process.env.NODE_ENV !== "test") server.listen(PORT, "0.0.0.0", () => console.log(`Payment API listening on ${PORT}`));
