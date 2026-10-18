/* Tap/click a product photo to open a zoomable view. */
(() => {
  const selector = "main .shop-gallery img, main .diwali-product-image img";
  const style = document.createElement("style");
  style.textContent = [
    ".product-zoom-dialog{border:0;padding:0;background:transparent;max-width:none;max-height:none;width:100vw;height:100dvh;overflow:hidden;color:#fff}",
    ".product-zoom-dialog::backdrop{background:rgba(12,8,14,.94)}",
    ".product-zoom-shell{position:relative;display:grid;grid-template-rows:auto 1fr auto;width:100%;height:100%;padding:12px;box-sizing:border-box}",
    ".product-zoom-toolbar{display:flex;justify-content:flex-end;gap:10px;align-items:center;z-index:2}",
    ".product-zoom-toolbar button,.product-zoom-controls button{border:0;border-radius:999px;background:#fff;color:#21141d;font-size:20px;font-weight:700;min-width:46px;min-height:46px;cursor:pointer;box-shadow:0 2px 10px #0005}",
    ".product-zoom-toolbar button{font-size:26px}",
    ".product-zoom-stage{min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none}",
    ".product-zoom-image{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;transform-origin:center center;user-select:none;-webkit-user-drag:none;cursor:grab}",
    ".product-zoom-image.is-dragging{cursor:grabbing}",
    ".product-zoom-controls{display:flex;justify-content:center;align-items:center;gap:12px;padding:10px 0 2px}",
    ".product-zoom-level{min-width:56px;text-align:center;font:600 14px system-ui,sans-serif}",
    ".product-zoom-hint{position:absolute;left:10px;top:22px;margin:0;color:#fff;font:13px system-ui,sans-serif;opacity:.85}",
    ".product-zoomable{cursor:zoom-in}",
    ".product-zoomable:focus-visible{outline:3px solid #dc8b30;outline-offset:3px}"
  ].join("");
  document.head.appendChild(style);

  const dialog = document.createElement("dialog");
  dialog.className = "product-zoom-dialog";
  dialog.setAttribute("aria-label", "Product photo viewer");
  dialog.innerHTML = '<div class="product-zoom-shell"><p class="product-zoom-hint">Pinch or use − / + to zoom</p><div class="product-zoom-toolbar"><button type="button" class="product-zoom-close" aria-label="Close photo viewer">×</button></div><div class="product-zoom-stage"><img class="product-zoom-image" alt=""></div><div class="product-zoom-controls"><button type="button" class="product-zoom-out" aria-label="Zoom out">−</button><span class="product-zoom-level" aria-live="polite">100%</span><button type="button" class="product-zoom-in" aria-label="Zoom in">+</button><button type="button" class="product-zoom-reset" aria-label="Reset zoom">Reset</button></div></div>';
  document.body.appendChild(dialog);

  const image = dialog.querySelector(".product-zoom-image");
  const stage = dialog.querySelector(".product-zoom-stage");
  const level = dialog.querySelector(".product-zoom-level");
  let scale = 1, x = 0, y = 0, pointers = new Map(), pinchStart = 1, pinchScale = 1, dragStart = null;

  function render() {
    image.style.transform = "translate(" + x + "px," + y + "px) scale(" + scale + ")";
    level.textContent = Math.round(scale * 100) + "%";
    image.style.cursor = scale > 1 ? "grab" : "default";
  }
  function reset() { scale = 1; x = 0; y = 0; render(); }
  function zoomTo(value) { scale = Math.max(1, Math.min(4, value)); if (scale === 1) { x = 0; y = 0; } render(); }
  function openPhoto(photo) {
    image.src = photo.currentSrc || photo.src;
    image.alt = photo.alt || "Product photo";
    dialog.showModal();
    reset();
  }

  document.querySelectorAll(selector).forEach((photo) => {
    if (photo.closest("[data-category-link]")) return;
    photo.classList.add("product-zoomable");
    photo.tabIndex = 0;
    photo.setAttribute("role", "button");
    photo.setAttribute("aria-label", (photo.alt || "Product photo") + ". Open to zoom.");
    photo.addEventListener("click", () => openPhoto(photo));
    photo.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openPhoto(photo); }
    });
  });

  dialog.querySelector(".product-zoom-close").addEventListener("click", () => dialog.close());
  dialog.querySelector(".product-zoom-in").addEventListener("click", () => zoomTo(scale + 0.25));
  dialog.querySelector(".product-zoom-out").addEventListener("click", () => zoomTo(scale - 0.25));
  dialog.querySelector(".product-zoom-reset").addEventListener("click", reset);
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => { pointers.clear(); dragStart = null; });

  stage.addEventListener("wheel", (event) => {
    event.preventDefault();
    zoomTo(scale + (event.deltaY < 0 ? 0.2 : -0.2));
  }, { passive: false });
  stage.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1 && scale > 1) {
      dragStart = { x: event.clientX, y: event.clientY, panX: x, panY: y };
      image.classList.add("is-dragging");
    } else if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      pinchStart = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchScale = scale;
      dragStart = null;
    }
  });
  stage.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchStart) zoomTo(pinchScale * distance / pinchStart);
    } else if (pointers.size === 1 && dragStart && scale > 1) {
      x = dragStart.panX + event.clientX - dragStart.x;
      y = dragStart.panY + event.clientY - dragStart.y;
      render();
    }
  });
  function releasePointer(event) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchStart = 1;
    if (pointers.size === 0) { dragStart = null; image.classList.remove("is-dragging"); }
    else if (pointers.size === 1 && scale > 1) {
      const remaining = Array.from(pointers.values())[0];
      dragStart = { x: remaining.x, y: remaining.y, panX: x, panY: y };
    }
  }
  stage.addEventListener("pointerup", releasePointer);
  stage.addEventListener("pointercancel", releasePointer);
  image.addEventListener("dblclick", () => scale > 1 ? reset() : zoomTo(2));
  document.addEventListener("keydown", (event) => {
    if (!dialog.open) return;
    if (event.key === "+" || event.key === "=") zoomTo(scale + 0.25);
    if (event.key === "-") zoomTo(scale - 0.25);
    if (event.key === "0") reset();
  });
})();