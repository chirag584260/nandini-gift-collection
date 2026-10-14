export const CATALOG = Object.freeze({
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
    throw new Error("Choose between 1 and 10 Diwali products.");
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
