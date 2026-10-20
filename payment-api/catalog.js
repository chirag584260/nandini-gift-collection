export const CATALOG = Object.freeze({
  "ganesh-ji-black-stone-idol": { name: "Ganesh ji Black Stone Idol", price: 1299 },
  "kanha-ji-with-cow-murti": { name: "Kanha ji with cow Murti", price: 1199 },
  "face-kanha": { name: "Face Kanha", price: 999 },
  "radha-krishna-matki-murti": { name: "Radha Krishna Matki Murti", price: 1299 },
  "high-speed-remote-charging-car": { name: "High speed remote charging Car", price: 749 },
  "rock-crawler-remote-car": { name: "Rock crawler remote car", price: 699 },
  "lightspeed-smoke-charging-car": { name: "lightspeed smoke charging car", price: 799 },

  "dancing-monkey": { name: "Dancing monkey", price: 499 },
  "rabbit-dance-toy": { name: "Rabbit Dance Toy", price: 599 },
  "drummer-elephant": { name: "Drummer Elephant", price: 499 },
  "banana-monkey-toy": { name: "Banana Monkey Toy", price: 249 },
  "cute-puppy-dog": { name: "Cute Puppy Dog", price: 399 },

  "study-book-for-kids-learning": { name: "study book for kids learning", price: 349 },
  "gaddi-chargeable-remote-car-with-song": { name: "Gaddi Chargeable Remote Car with Song", price: 649 },
  "mobile-toy-for-kids-learning-with-fun": { name: "Mobile toy for kids (Learning with fun)", price: 249 },
  "small-sunt-car-chargeable": { name: "Small Sunt Car chargeable", price: 399 },
  "smoke-remote-car-chargeable": { name: "Smoke Remote Car chargeable", price: 449 },
  "dancing-cactus-toy": { name: "Dancing Cactus toy", price: 299 },
  "building-blocks-for-kids": { name: "Building blocks for Kids", price: 299 },
  "laptop-for-kids-play": { name: "Xylophone Musical Toy", price: 349 },
  "kids-study-book": { name: "Laptop for kids", price: 449 },
  "elephant-toy": { name: "Battery-Operated Elephant Toy", price: 399 },
  "dancing-duck": { name: "Cute Dancing Duck Toy (Ages 1–3)", price: 599 },
  "walking-dog-puppy": { name: "Walking Cute Dog Puppy", price: 399 },
  "buddha-hands-on-pose-statue": { name: "Buddha Hands-on pose Statue", price: 799 },
  "ram-lala-statue": { name: "Ram Lala Statue", price: 899 },
  "krishna-face-statue": { name: "Krishna Face Statue", price: 699 },
  "buddha-face-statue": { name: "Buddha Face Statue", price: 499 },
  "meditate-buddha-statue": { name: "Meditate Buddha Statue", price: 799 },
  "greenmonk-buddha": { name: "GreenMonk Buddha", price: 699 },
  "swan-couple-black": { name: "Swan Couple (Black)", price: 799 },
  "rajasthani-set-of-4": { name: "Rajasthani Set of 4", price: 1299 },
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
  "glitter-grey-white-flower-mala-pack-of-6": { name: "Glitter Grey white Flower mala pack of 6", price: 599 },
  "dark-pink-cloth-mala-pack-of-6": { name: "Dark Pink cloth mala pack of 6", price: 699 },
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
