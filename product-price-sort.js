(() => {
  const priceOf = (card) => {
    const label = card.querySelector('.diwali-product-price, .price');
    const amount = label?.textContent.replace(/,/g, '').match(/(?:₹|Rs\.?)[\s]*([0-9]+(?:\.[0-9]+)?)/i);
    return amount ? Number(amount[1]) : Infinity;
  };

  document.querySelectorAll('.diwali-product-grid, #grid.catgrid').forEach((grid) => {
    const cards = Array.from(grid.children);
    cards.sort((a, b) => priceOf(a) - priceOf(b));
    grid.append(...cards);
  });
})();
