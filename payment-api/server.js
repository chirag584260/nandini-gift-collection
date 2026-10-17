import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { priceCart } from "./catalog.js";

const PORT = Number(process.env.PORT || 10000);
const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const SITE_ORIGINS = new Set(
  (process.env.SITE_ORIGINS || "https://nandinigift.in,https://www.nandinigift.in")
    .split(",").map((origin) => origin.trim()).filter(Boolean),
);

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 16_384) reject(new Error("Request is too large."));
    });
    req.on("end", () => {
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
    res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type");
  }
  if (req.method === "OPTIONS") return res.writeHead(204).end();

  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/health") return send(res, 200, { ok: true });
  if (req.method === "GET" && url.pathname === "/api/config") {
    return send(res, 200, { enabled: Boolean(KEY_ID && KEY_SECRET), keyId: KEY_ID || null });
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
      if (payment.order_id !== orderId || order.amount !== amount * 100 || payment.amount !== order.amount || payment.currency !== "INR") {
        return send(res, 400, { verified: false, error: "Payment details do not match this cart." });
      }
      if (payment.status !== "captured") {
        return send(res, 202, { verified: false, pending: true, error: "Payment is authorised and awaiting capture. Please contact the shop before retrying." });
      }
      return send(res, 200, { verified: true, paymentId: payment.id, status: payment.status });
    } catch (error) {
      return send(res, error.message.includes("Cart") || error.message.includes("Choose") ? 400 : 502, { verified: false, error: error.message });
    }
  }

  return send(res, 404, { error: "Not found." });
});

if (process.env.NODE_ENV !== "test") server.listen(PORT, "0.0.0.0", () => console.log(`Payment API listening on ${PORT}`));
