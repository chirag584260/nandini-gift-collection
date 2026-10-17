import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

process.env.NODE_ENV = "test";
process.env.RAZORPAY_KEY_SECRET = "unit-test-secret";
const { verifyCheckoutSignature } = await import("./server.js?signature-test");

test("accepts a valid Razorpay checkout HMAC and rejects a changed value", () => {
  const orderId = "order_test123";
  const paymentId = "pay_test456";
  const signature = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`).digest("hex");
  assert.equal(verifyCheckoutSignature(orderId, paymentId, signature), true);
  assert.equal(verifyCheckoutSignature(orderId, paymentId, `${signature.slice(0, -1)}0`), false);
});
