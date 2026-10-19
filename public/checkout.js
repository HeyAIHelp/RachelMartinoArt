/* Checkout: order form + Square card field. The card number is entered in
   Square's own secure field; this page only ever sees a one-time token,
   which the /pay function uses to charge the card. */
(async function () {
  const form = $("#checkout-form");
  const payBtn = $("#pay-btn"), payMsg = $("#pay-msg");
  let card = null, busy = false;

  const cat = await catalogReady;
  const method = () => (form.elements.method && form.elements.method.value) || "ship";
  const quote = () => CartMath.priceCart(cat, Cart.read(), method());

  /* --- shipping choices --- */
  const s = cat.shipping;
  $("#ship-opts").innerHTML = `
    <label><input type="radio" name="method" value="ship" checked> Ship it to me <span class="p" id="ship-price"></span></label>
    ${s.localPickup ? `<label><input type="radio" name="method" value="pickup"> ${esc(s.pickupLabel)} <span class="p">Free</span></label>` : ""}`;

  function render() {
    const q = quote();
    const empty = !q.lines.length;
    $("#checkout").hidden = empty;
    $("#empty-cart").hidden = !empty || !$("#thanks").hidden;
    if (empty) return;

    $("#summary-lines").innerHTML = q.lines.map(l => `
      <div class="line">
        <img src="${IMG(l.img, 200)}" alt="">
        <div><b>${esc(l.name)}</b><div style="font-size:14px;color:var(--ink-soft)">Qty ${l.qty} × ${money(l.unitCents)}</div></div>
        <span class="amt">${money(l.lineCents)}</span>
      </div>`).join("");
    const shipQ = CartMath.priceCart(cat, Cart.read(), "ship");
    $("#ship-price").textContent = shipQ.shipping ? money(shipQ.shipping) : "Free";
    $("#sum-sub").textContent = money(q.subtotal);
    $("#sum-ship").textContent = q.shipping ? money(q.shipping) : "Free";
    $("#sum-total").textContent = money(q.total);
    payBtn.textContent = `Pay ${money(q.total)}`;

    const pickup = q.method === "pickup";
    $("#address-fields").hidden = pickup;
    $$("#address-fields input").forEach(i => i.disabled = pickup);
  }
  form.addEventListener("change", e => { if (e.target.name === "method") render(); });
  document.addEventListener("cart:change", render);
  render();

  /* --- connect the Square card field --- */
  try {
    const cfg = await fetch("/.netlify/functions/config").then(r => { if (!r.ok) throw 0; return r.json(); });
    if (!cfg.applicationId || !cfg.locationId) throw 0;
    await new Promise((res, rej) => {
      const sc = document.createElement("script");
      sc.src = cfg.environment === "production" ? "https://web.squarecdn.com/v1/square.js" : "https://sandbox.web.squarecdn.com/v1/square.js";
      sc.onload = res; sc.onerror = rej; document.head.append(sc);
    });
    const payments = window.Square.payments(cfg.applicationId, cfg.locationId);
    card = await payments.card();
    await card.attach("#card-container");
    payBtn.disabled = false;
  } catch {
    $("#pay-unavailable").hidden = false;
    $("#card-container").hidden = true;
  }

  /* --- pay --- */
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (busy || !card) return;
    payMsg.textContent = ""; payMsg.className = "pay-msg";
    if (!form.checkValidity()) { form.reportValidity(); return; }

    busy = true; payBtn.disabled = true; payBtn.textContent = "Processing…";
    try {
      const tok = await card.tokenize();
      if (tok.status !== "OK") throw new Error((tok.errors && tok.errors[0] && tok.errors[0].message) || "Please check your card details.");

      const d = Object.fromEntries(new FormData(form));
      const q = quote();
      const res = await fetch("/.netlify/functions/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: tok.token,
          idempotencyKey: crypto.randomUUID(),
          items: Cart.read(),
          method: q.method,
          expectedTotal: q.total,
          customer: d,
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || "Something went wrong. Your card was not charged.");

      $("#thanks").hidden = false;   // before clearing, so the "empty cart" note stays hidden
      Cart.clear();
      if (q.method === "pickup") $("#thanks-msg").textContent = "Your order is in. A receipt is on its way to your inbox, and I'll email you to set up a pickup time in Newport.";
      if (out.receiptUrl) { const a = $("#receipt-link"); a.href = out.receiptUrl; a.hidden = false; }
      window.scrollTo({ top: 0 });
    } catch (err) {
      payMsg.textContent = err.message; payMsg.className = "pay-msg err";
      payBtn.disabled = false; render();
    } finally {
      busy = false;
    }
  });
})();
