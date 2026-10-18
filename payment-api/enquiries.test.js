import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac } from "node:crypto";
import { EnquiryStore, CONSENT_VERSION, CONSENT_TEXT } from "./enquiry-store.js";

test("consented enquiries persist, remain private, can be withdrawn, and link only to verified payments", async t => {
  const directory = await mkdtemp(join(tmpdir(), "nandini-enquiry-test-"));
  process.env.NODE_ENV = "test";
  process.env.RAZORPAY_KEY_ID = "rzp_test_enquiries";
  process.env.RAZORPAY_KEY_SECRET = "test-enquiry-payment-secret";
  process.env.ENQUIRY_DATA_DIR = directory;
  process.env.ENQUIRY_ADMIN_TOKEN = "test-owner-password-with-more-than-32-characters";
  const { server } = await import("./server.js?enquiries-test");
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const nativeFetch = globalThis.fetch;
  let orderCount = 0;
  const orders = new Map();
  globalThis.fetch = async (url, options) => {
    if (!String(url).startsWith("https://api.razorpay.com/")) return nativeFetch(url, options);
    const path = new URL(url).pathname;
    if (path === "/v1/orders" && options.method === "POST") {
      const request = JSON.parse(options.body), id = `order_test_${++orderCount}`;
      const order = { ...request, id }; orders.set(id, order); return Response.json(order);
    }
    if (path.startsWith("/v1/orders/")) return Response.json(orders.get(path.split("/").at(-1)));
    if (path === "/v1/payments/pay_test") {
      const order = orders.get("order_test_1");
      return Response.json({ id: "pay_test", order_id: order.id, amount: order.amount, currency: "INR", status: "captured" });
    }
    throw new Error("Unexpected Razorpay request");
  };
  t.after(async () => { globalThis.fetch = nativeFetch; await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const payload = { name: "Test Customer", mobile: "9000000000", items: [{ id: "dancing-duck", quantity: 1 }], consent: true, consentVersion: CONSENT_VERSION };
  const post = async (path, body, headers = {}) => nativeFetch(base + path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  const admin = () => nativeFetch(base + "/api/admin/enquiries", { headers: { authorization: `Bearer ${process.env.ENQUIRY_ADMIN_TOKEN}` } });

  await t.test("rejects absent/false/coerced consent, invalid contacts, untrusted origins and oversized bodies", async () => {
    for (const consent of [undefined, false, "true", 1]) assert.equal((await post("/api/enquiries", { ...payload, consent })).status, 400);
    assert.equal((await post("/api/enquiries", { ...payload, consentVersion: "old" })).status, 400);
    assert.equal((await post("/api/enquiries", { ...payload, mobile: "123" })).status, 400);
    assert.equal((await post("/api/enquiries", payload, { origin: "https://another-shop.example" })).status, 403);
    assert.equal((await post("/api/enquiries", { ...payload, name: "x".repeat(20_000) })).status, 400);
    assert.deepEqual((await (await admin()).json()).enquiries, []);
  });
  let reference;
  await t.test("saves before checkout without a Razorpay order, persists after reopening, and protects owner data", async () => {
    const config = await (await nativeFetch(base + "/api/config")).json(); assert.equal(config.enquiriesEnabled, true);
    const response = await post("/api/enquiries", payload); assert.equal(response.status, 201); reference = await response.json();
    assert.equal(orderCount, 0);
    const store = new EnquiryStore(directory), records = await store.list();
    assert.equal(records.length, 1); assert.equal(records[0].mobile, payload.mobile); assert.equal(records[0].amount, 599);
    assert.equal(records[0].consentText, CONSENT_TEXT); assert.equal(records[0].status, "enquiry");
    assert.equal("tokenHash" in records[0], false); assert.equal("token" in records[0], false);
    assert.equal((await nativeFetch(base + "/api/admin/enquiries")).status, 401);
    assert.equal((await nativeFetch(base + "/api/admin/enquiries", { headers: { authorization: "Bearer wrong" } })).status, 401);
    assert.equal((await nativeFetch(base + "/enquiries")).headers.get("x-robots-tag"), "noindex, nofollow");
    assert.equal((await stat(join(directory, "enquiries.json"))).mode & 0o777, 0o600);
  });
  await t.test("links checkout but marks paid only after successful server verification", async () => {
    const response = await post("/api/razorpay/order", { items: payload.items, pinCode: "462026", deliveryDetails: { name: payload.name, mobile: payload.mobile, address: "Test address, Bhopal" }, enquiry: reference });
    assert.equal(response.status, 200); const order = await response.json();
    assert.equal((await (await admin()).json()).enquiries[0].status, "checkout_started");
    assert.equal((await post("/api/razorpay/verify", { orderId: order.orderId, paymentId: "pay_test", signature: "invalid", items: payload.items })).status, 400);
    assert.equal((await (await admin()).json()).enquiries[0].status, "checkout_started");
    const signature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${order.orderId}|pay_test`).digest("hex");
    assert.equal((await post("/api/razorpay/verify", { orderId: order.orderId, paymentId: "pay_test", signature, items: payload.items })).status, 200);
    assert.equal((await (await admin()).json()).enquiries[0].status, "paid");
  });
  await t.test("requires the per-enquiry token for withdrawal; ordinary checkout creates no follow-up record", async () => {
    assert.equal((await post(`/api/enquiries/${reference.id}/withdraw`, { token: "0".repeat(64) })).status, 404);
    assert.equal((await post(`/api/enquiries/${reference.id}/withdraw`, { token: reference.token })).status, 200);
    assert.equal((await (await admin()).json()).enquiries.length, 0);
    assert.equal((await post("/api/razorpay/order", { items: payload.items, pinCode: "462026", deliveryDetails: { name: payload.name, mobile: payload.mobile, address: "Test address, Bhopal" } })).status, 200);
    assert.equal((await (await admin()).json()).enquiries.length, 0);
  });
  await t.test("concurrent writes survive and owner deletion requires authentication", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => post("/api/enquiries", payload)));
    assert(results.every(r => r.status === 201));
    const records = (await (await admin()).json()).enquiries; assert.equal(records.length, 8);
    assert.equal((await nativeFetch(base + `/api/admin/enquiries/${records[0].id}`, { method: "DELETE" })).status, 401);
    const response = await nativeFetch(base + `/api/admin/enquiries/${records[0].id}`, { method: "DELETE", headers: { authorization: `Bearer ${process.env.ENQUIRY_ADMIN_TOKEN}` } });
    assert.equal(response.status, 200); assert.equal((await (await admin()).json()).enquiries.length, 7);
  });
});
