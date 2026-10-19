/* Shared cart pricing: used by the browser (cart + checkout) AND by the
   payment function on the server, so the total a shopper sees is the total
   they're charged. Prices always come from catalog.js, never the browser. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CartMath = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const MAX_QTY = 20;

  function priceCart(catalog, items, method) {
    const byId = Object.fromEntries(catalog.products.map(p => [p.id, p]));
    const lines = [];
    for (const it of items || []) {
      const p = byId[it && it.id];
      const qty = Math.min(MAX_QTY, Math.max(0, Math.floor(Number(it && it.qty) || 0)));
      if (!p || !qty) continue;
      lines.push({ id: p.id, name: p.name, img: p.img, qty, unitCents: p.priceCents, lineCents: p.priceCents * qty });
    }
    const subtotal = lines.reduce((s, l) => s + l.lineCents, 0);
    const s = catalog.shipping || {};
    const pickup = method === "pickup" && s.localPickup;
    const shipping = !lines.length || pickup || (s.freeOverCents && subtotal >= s.freeOverCents) ? 0 : (s.flatRateCents || 0);
    return { lines, subtotal, shipping, total: subtotal + shipping, method: pickup ? "pickup" : "ship" };
  }

  const money = c => "$" + (c / 100).toFixed(2).replace(/\.00$/, "");

  return { priceCart, money, MAX_QTY };
});
