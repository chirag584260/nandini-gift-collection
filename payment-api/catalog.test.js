import test from "node:test";
import assert from "node:assert/strict";
import { priceCart } from "./catalog.js";

test("prices only the fixed-price Diwali products from the server catalog", () => {
  assert.deepEqual(priceCart([
    { id: "mala-orange-yellow", quantity: 2 },
    { id: "led-water-diya-set", quantity: 1 },
  ]).amount, 597);
});

test("prices the dancing duck at its fixed listed price", () => {
  assert.equal(priceCart([{ id: "dancing-duck", quantity: 1 }]).amount, 599);
});

test("prices the walking puppy at its fixed listed price", () => {
  assert.equal(priceCart([{ id: "walking-dog-puppy", quantity: 1 }]).amount, 399);
});

test("prices the Buddha Hands-on pose Statue at its fixed listed price", () => {
  assert.equal(priceCart([{ id: "buddha-hands-on-pose-statue", quantity: 1 }]).amount, 799);
});

test("rejects starting-price products and client-provided prices", () => {
  assert.throws(() => priceCart([{ id: "existing-0", quantity: 1, price: 1 }]), /invalid product/);
});

test("rejects invalid quantities and duplicate items", () => {
  assert.throws(() => priceCart([{ id: "marigold-toran", quantity: 0 }]), /invalid product/);
  assert.throws(() => priceCart([
    { id: "marigold-toran", quantity: 1 },
    { id: "marigold-toran", quantity: 1 },
  ]), /invalid product/);
});
