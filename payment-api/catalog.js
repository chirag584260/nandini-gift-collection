export const CATALOG = Object.freeze({
  "elephant-toy": { name: "Battery-Operated Elephant Toy", price: 399 },
  "dancing-duck": { name: "Cute Dancing Duck Toy (Ages 1–3)", price: 599 },
  "walking-dog-puppy": { name: "Walking Cute Dog Puppy", price: 399 },
  "buddha-hands-on-pose-statue": { name: "Buddha Hands-on pose Statue", price: 799 },
  "mala-orange-yellow": { name: "Decorative Mala Pack — Orange & Yellow", price: 149 },
  "mala-orange-white": { name: "Decorative Mala Pack — Orange & White", price: 149 },
  "flower-jhoomar-marigold": { name: "Flower Jhoomar — Marigold", price: 199 },
  "flower-jhoomar-marigold-jasmine": { name: "Flower Jhoomar — Marigold & Jasmine", price: 199 },
  "led-water-diya-set": { name: "LED Water Diya Set", price: 299 },
  "led-diyas-box": { name: "LED Diya Lights — Festive Box", price: 299 },
  "marigold-toran": { name: "Decorative Toran — Marigold", price: 199 },
  "handmade-bandhanwar": { name: "Bandhanwar — Traditional Style", price: 199 },
  "multicolor-gerbera-bunch": { name: "Artificial Flower Bunch — Gerbera", price: 129 },
  "multicolor-flower-bunch": { name: "Artificial Flower Bunch — Mixed Flowers", price: 129 },
});

export function priceCart(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 10) {
    throw new Error("Choose between 1 and 10 fixed-price products.");
  }

  const seen = new Set();
  const lines = items.map((item) => {
    const product = CATALOG[item?.id];
    const quantity = item?.quantity;
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20 || seen.has(item.id)) {
      throw new Error("Cart contains an invalid product or quantity.");
    }
    seen.add(item.id);
    return { id: item.id, name: product.name, quantity, unitPrice: product.price };
  });

  return {
    lines,
    amount: lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
  };
}

export function validateDeliveryDetails(customer, pinValue) {
  const name = typeof customer?.name === "string" ? customer.name.trim() : "";
  const mobile = typeof customer?.mobile === "string" ? customer.mobile.replace(/\\D/g, "") : "";
  const address = typeof customer?.address === "string" ? customer.address.trim() : "";
  const pinCode = typeof pinValue === "string" ? pinValue.trim() : "";

  const invalid = (message) => {
    const error = new Error(message);
    error.status = 400;
    return error;
  };

  if (name.length < 2 || name.length > 100) {
    throw invalid("Enter the customer’s name (2–100 characters).");
  }
  if (!/^[6-9]\\d{9}$/.test(mobile)) {
    throw invalid("Enter a valid 10-digit Indian mobile number.");
  }
  if (address.length < 8 || address.length > 240) {
    throw invalid("Enter a complete delivery address (8–240 characters).");
  }
  if (!/^\\d{6}$/.test(pinCode)) {
    throw invalid("Enter a valid 6-digit delivery PIN code.");
  }

  return { name, mobile, address, pinCode };
}
