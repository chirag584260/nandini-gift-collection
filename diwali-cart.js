(() => {
  // Set this to the deployed payment-api URL, without a trailing slash.
  const PAYMENT_API_BASE = "https://nandini-gift-payment-api.onrender.com";
  const PRODUCTS = [
    { id: "mala-orange-yellow", name: "Decorative Mala Pack — Orange & Yellow", price: 149, unit: "Pack of 5 pieces", image: "images/diwali/mala-orange-yellow.webp" },
    { id: "mala-orange-white", name: "Decorative Mala Pack — Orange & White", price: 149, unit: "Pack of 5 pieces", image: "images/diwali/mala-orange-white.webp" },
    { id: "flower-jhoomar-marigold", name: "Flower Jhoomar — Marigold", price: 199, unit: "Each", image: "images/diwali/flower-jhoomar-marigold.webp" },
    { id: "flower-jhoomar-marigold-jasmine", name: "Flower Jhoomar — Marigold & Jasmine", price: 199, unit: "Each", image: "images/diwali/flower-jhoomar-marigold-jasmine.webp" },
    { id: "led-water-diya-set", name: "LED Water Diya Set", price: 299, unit: "Per box", image: "images/diwali/led-water-diya-set.webp" },
    { id: "led-diyas-box", name: "LED Diya Lights — Festive Box", price: 299, unit: "Per box", image: "images/diwali/led-diyas-box.webp" },
    { id: "marigold-toran", name: "Decorative Toran — Marigold", price: 199, unit: "Each", image: "images/diwali/marigold-toran.webp" },
    { id: "handmade-bandhanwar", name: "Bandhanwar — Traditional Style", price: 199, unit: "Each", image: "images/diwali/handmade-bandhanwar.webp" },
    { id: "multicolor-gerbera-bunch", name: "Artificial Flower Bunch — Gerbera", price: 129, unit: "Each", image: "images/diwali/multicolor-gerbera-bunch.webp" },
    { id: "multicolor-flower-bunch", name: "Artificial Flower Bunch — Mixed Flowers", price: 129, unit: "Each", image: "images/diwali/multicolor-flower-bunch.webp" },
  ];
  const productById = new Map(PRODUCTS.map((product) => [product.id, product]));
  const existing = [...document.querySelectorAll(".shop-gallery figure")].map((figure, index) => {
    const caption = figure.querySelector("figcaption");
    const priceText = caption?.querySelector(".diwali-tag")?.textContent || "";
    const image = figure.querySelector("img");
    const name = caption?.cloneNode(true);
    name?.querySelectorAll(".diwali-tag").forEach((node) => node.remove());
    const match = priceText.match(/[0-9][0-9,]*/);
    const product = {
      id: `existing-${index}`,
      name: name?.textContent.trim() || "Gift item",
      price: match ? Number(match[0].replaceAll(",", "")) : 0,
      unit: "each, from displayed price",
      image: image?.getAttribute("src") || "",
      fixedPrice: false,
    };
    return product;
  }).filter((product) => product.price > 0 && product.image);
  const ALL_PRODUCTS = [...existing, ...PRODUCTS.map((product) => ({ ...product, fixedPrice: true }))];

  document.querySelectorAll(".shop-gallery figure").forEach((figure, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "diwali-add existing-product-add";
    button.dataset.productId = `existing-${index}`;
    button.textContent = "Add to Cart";
    const caption = figure.querySelector("figcaption")?.cloneNode(true);
    caption?.querySelectorAll(".diwali-tag").forEach((node) => node.remove());
    button.setAttribute("aria-label", `Add ${caption?.textContent.trim() || "gift item"} to cart`);
    figure.append(button);
  });

  const cartKey = "nandini-gift-cart-v1";
  let cart = {};
  try {
    const saved = JSON.parse(localStorage.getItem(cartKey) || "{}");
    for (const product of ALL_PRODUCTS) {
      const quantity = Number(saved[product.id]);
      if (Number.isInteger(quantity) && quantity > 0 && quantity < 100) cart[product.id] = quantity;
    }
  } catch { /* Ignore damaged browser storage and start with an empty cart. */ }

  const cartButton = document.createElement("button");
  cartButton.className = "diwali-cart-button";
  cartButton.type = "button";
  cartButton.setAttribute("aria-expanded", "false");
  cartButton.setAttribute("aria-label", "Open shopping cart");
  cartButton.innerHTML = '🛒 <span>Cart</span> <b class="diwali-cart-count">0</b>';
  document.body.append(cartButton);

  const dialog = document.createElement("dialog");
  dialog.className = "diwali-cart-dialog";
  dialog.setAttribute("aria-labelledby", "diwali-cart-title");
  dialog.innerHTML = '<div class="diwali-cart-head"><div><p class="diwali-eyebrow">NANDINI GIFT COLLECTION</p><h2 id="diwali-cart-title">Your Shopping Cart</h2></div><button class="diwali-cart-close" type="button" aria-label="Close cart">×</button></div><div class="diwali-cart-items"></div><p class="diwali-cart-empty">Your cart is empty. Add products to get started.</p><div class="diwali-cart-summary"><p class="diwali-cart-total">Subtotal: ₹0</p><label class="diwali-pin-label" for="diwali-pin-code">Delivery PIN code (India)</label><input class="diwali-pin-code" id="diwali-pin-code" inputmode="numeric" autocomplete="postal-code" maxlength="6" placeholder="6-digit PIN code"><small class="diwali-payment-note">Online payment covers product prices only. Delivery charges are extra and will be confirmed separately on WhatsApp. Products with “starting from” prices need a quote before payment.</small><p class="diwali-payment-status" role="status" aria-live="polite"></p><button class="diwali-pay-button" type="button" disabled>Pay with Razorpay</button><button class="diwali-checkout" type="button" disabled>Order on WhatsApp</button></div>';
  document.body.append(dialog);

  const list = dialog.querySelector(".diwali-cart-items");
  const empty = dialog.querySelector(".diwali-cart-empty");
  const totalElement = dialog.querySelector(".diwali-cart-total");
  const whatsAppButton = dialog.querySelector(".diwali-checkout");
  const payButton = dialog.querySelector(".diwali-pay-button");
  const pinCodeInput = dialog.querySelector(".diwali-pin-code");
  const status = dialog.querySelector(".diwali-payment-status");
  const count = cartButton.querySelector(".diwali-cart-count");
  let paymentConfig = { enabled: false, keyId: null };

  function save() {
    try { localStorage.setItem(cartKey, JSON.stringify(cart)); } catch { /* Cart remains usable for this visit. */ }
  }

  function selectedProducts() {
    return ALL_PRODUCTS.filter((product) => cart[product.id]);
  }

  function cartHasFixedPricesOnly() {
    const selected = selectedProducts();
    return selected.length > 0 && selected.every((product) => product.fixedPrice);
  }

  function render() {
    list.replaceChildren();
    let subtotal = 0;
    let itemCount = 0;
    for (const product of ALL_PRODUCTS) {
      const quantity = cart[product.id] || 0;
      if (!quantity) continue;
      itemCount += quantity;
      subtotal += quantity * product.price;
      const row = document.createElement("article");
      row.className = "diwali-cart-row";
      const image = document.createElement("img");
      image.src = product.image;
      image.alt = "";
      image.width = 58;
      image.height = 58;
      const info = document.createElement("div");
      info.className = "diwali-cart-row-info";
      const title = document.createElement("strong");
      title.textContent = product.name;
      const price = document.createElement("span");
      price.textContent = `₹${product.price} ${product.unit}`;
      info.append(title, price);
      const controls = document.createElement("div");
      controls.className = "diwali-cart-controls";
      for (const [label, action, symbol] of [[`Decrease ${product.name}`, "minus", "−"], [`Increase ${product.name}`, "plus", "+"]]) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.action = action;
        button.dataset.id = product.id;
        button.setAttribute("aria-label", label);
        button.textContent = symbol;
        controls.append(button);
      }
      const quantityNode = document.createElement("span");
      quantityNode.textContent = String(quantity);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.action = "remove";
      remove.dataset.id = product.id;
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", `Remove ${product.name}`);
      controls.append(quantityNode, remove);
      row.append(image, info, controls);
      list.append(row);
    }

    count.textContent = String(itemCount);
    cartButton.setAttribute("aria-label", `Open cart, ${itemCount} items`);
    empty.hidden = itemCount > 0;
    totalElement.textContent = `Subtotal: ₹${subtotal}`;
    whatsAppButton.disabled = itemCount === 0;
    payButton.disabled = itemCount === 0 || !paymentConfig.enabled || !cartHasFixedPricesOnly();
    save();
  }

  async function loadPaymentConfig() {
    if (!PAYMENT_API_BASE) {
      status.textContent = "Online payment is not activated yet. Please order on WhatsApp.";
      return;
    }
    try {
      const response = await fetch(`${PAYMENT_API_BASE}/api/config`, { headers: { accept: "application/json" } });
      paymentConfig = await response.json();
      status.textContent = paymentConfig.enabled ? "Delivery will be charged separately after confirmation on WhatsApp." : "Online payment is not activated yet. Please order on WhatsApp.";
    } catch {
      status.textContent = "Online payment is temporarily unavailable. Please order on WhatsApp.";
    }
    render();
  }

  function loadRazorpayCheckout() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) return resolve();
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Secure checkout could not load. Please try again."));
      document.head.append(script);
    });
  }

  async function payWithRazorpay() {
    const selected = selectedProducts();
    if (!paymentConfig.enabled || !cartHasFixedPricesOnly()) return;
    const pinCode = pinCodeInput.value.trim();
    if (!/^\d{6}$/.test(pinCode)) {
      status.textContent = "Enter a valid 6-digit delivery PIN code before paying.";
      pinCodeInput.focus();
      return;
    }
    payButton.disabled = true;
    status.textContent = "Preparing secure checkout…";
    try {
      const items = selected.map((product) => ({ id: product.id, quantity: cart[product.id] }));
      const orderResponse = await fetch(`${PAYMENT_API_BASE}/api/razorpay/order`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items, pinCode }),
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.error || "Could not start payment. Please order on WhatsApp.");
      await loadRazorpayCheckout();
      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Nandini Gift Collection",
        description: "Diwali decorative products (delivery extra)",
        image: "https://nandinigift.in/shop-12.jpg",
        notes: { delivery_pin_code: pinCode },
        theme: { color: "#a3225d" },
        handler: async (result) => {
          status.textContent = "Verifying payment securely…";
          try {
            const verifyResponse = await fetch(`${PAYMENT_API_BASE}/api/razorpay/verify`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                orderId: result.razorpay_order_id,
                paymentId: result.razorpay_payment_id,
                signature: result.razorpay_signature,
                items,
              }),
            });
            const verification = await verifyResponse.json();
            if (!verificationResponseOk(verifyResponse, verification)) throw new Error(verification.error || "Payment could not be verified. Please contact the shop before paying again.");
            cart = {};
            save();
            render();
            status.textContent = "Payment captured. Please message the shop on WhatsApp with your payment ID to confirm delivery charges and address.";
          } catch (error) {
            status.textContent = error.message;
          }
        },
        modal: { ondismiss: () => { status.textContent = "Payment window closed. Your cart is saved."; render(); } },
      });
      checkout.on("payment.failed", (event) => {
        status.textContent = event?.error?.description || "Payment failed. Your cart is saved; you can retry or order on WhatsApp.";
        render();
      });
      checkout.open();
      status.textContent = "";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      render();
    }
  }

  function verificationResponseOk(response, result) {
    return response.ok && result?.verified === true;
  }

  cartButton.addEventListener("click", () => {
    dialog.showModal();
    cartButton.setAttribute("aria-expanded", "true");
  });
  dialog.querySelector(".diwali-cart-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => cartButton.setAttribute("aria-expanded", "false"));
  payButton.addEventListener("click", payWithRazorpay);
  pinCodeInput.addEventListener("input", () => { pinCodeInput.value = pinCodeInput.value.replace(/\D/g, "").slice(0, 6); });

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest(".diwali-add");
    if (addButton) {
      const product = ALL_PRODUCTS.find((item) => item.id === addButton.dataset.productId);
      if (!product) return;
      cart[product.id] = (cart[product.id] || 0) + 1;
      render();
      addButton.textContent = "Added ✓";
      setTimeout(() => { if (addButton.isConnected) addButton.textContent = "Add to Cart"; }, 1000);
      return;
    }
    const control = event.target.closest("[data-action]");
    if (!control) return;
    const id = control.dataset.id;
    if (control.dataset.action === "plus") cart[id] = (cart[id] || 0) + 1;
    else if (control.dataset.action === "minus") {
      cart[id] = (cart[id] || 0) - 1;
      if (cart[id] <= 0) delete cart[id];
    } else delete cart[id];
    render();
  });

  whatsAppButton.addEventListener("click", () => {
    const lines = selectedProducts().map((product) => `${product.name} × ${cart[product.id]} = ₹${product.price * cart[product.id]}`);
    const subtotal = selectedProducts().reduce((sum, product) => sum + product.price * cart[product.id], 0);
    const message = `Hello Nandini Gift Collection, I would like to order these items:\n${lines.join("\n")}\nSubtotal: ₹${subtotal}\nPlease confirm stock, delivery charges and delivery time. My PIN code is: ${pinCodeInput.value.trim()}`;
    window.open(`https://wa.me/918266814556?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  });

  render();
  loadPaymentConfig();
})();
