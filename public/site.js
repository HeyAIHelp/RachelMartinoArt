/* =====================================================================
   Products, prices and shipping live in catalog.js.
   Gallery photos live in GALLERY below.
   ===================================================================== */
const CONTACT_EMAIL = "rachel@rachelmartinoart.com";

const IMG = (id, w = 900) => `images/art/${id}-${w > 900 ? 1600 : 900}.jpg`;  // photos live in images/art (900px + 1600px)

// Shown in this order in an even grid. `true` = big featured tile.
// To keep rows even: (regular photos) must be a multiple of 4.
// Now: 1 big + 12 regular = 4 full rows on desktop.
const GALLERY = [
  ["IMG_8623","octopus at Yaquina Bay", true],
  ["holiday-elk","holiday elk cards"],
  ["IMG_9803","marigolds, block & print"],
  ["holiday-lights","candle cards, all lit up"],
  ["IMG_8684","swallowtail"],
  ["IMG_8837","pacific giant octopus"],
  ["holiday-gift","holiday card spread"],
  ["IMG_9224","dye day!"],
  ["IMG_9492","whales x2"],
  ["IMG_9502","chanterelle season"],
  ["IMG_0158","the card table"],
  ["IMG_9405","marigold on black"],
  ["IMG_9865","fresh off the press"],
];

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const kindLabel = {print:"art print", card:"card & stationery", apparel:"hand-dyed apparel"};
const { money } = CartMath;

/* ---------- "pulling the print": polaroid-style photos press flat as they scroll in ---------- */
const pressWatch = !matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window
  ? new IntersectionObserver(entries => {
      let i = 0;
      for (const e of entries) if (e.isIntersecting) {
        e.target.style.setProperty("--d", `${Math.min(i++, 5) * 90}ms`);   // stagger neighbors
        e.target.classList.add("in");
        pressWatch.unobserve(e.target);
      }
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" })
  : null;
function pressify(selector) {
  if (!pressWatch) return;
  $$(selector).forEach(el => { if (!el.classList.contains("press")) { el.classList.add("press"); pressWatch.observe(el); } });
}

/* ---------- cart (kept in this browser) ---------- */
const Cart = {
  KEY: "rma-cart",
  read() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch { return []; } },
  write(items) {
    try { localStorage.setItem(this.KEY, JSON.stringify(items)); } catch {}
    document.dispatchEvent(new CustomEvent("cart:change"));
  },
  add(id, qty = 1) {
    const items = this.read(), it = items.find(i => i.id === id);
    if (it) it.qty = Math.min(CartMath.MAX_QTY, it.qty + qty); else items.push({ id, qty });
    this.write(items);
  },
  set(id, qty) { this.write(this.read().map(i => i.id === id ? { ...i, qty } : i).filter(i => i.qty > 0)); },
  clear() { this.write([]); },
  count() { return this.read().reduce((n, i) => n + i.qty, 0); },
};

const CATALOG = window.RMA_CATALOG;
const catalogReady = Promise.resolve(CATALOG);

/* ---------- cart drawer (built once, shared by every page) ---------- */
document.body.insertAdjacentHTML("beforeend", `
  <div class="drawer-scrim" data-cart-close hidden></div>
  <aside class="drawer" id="cart-drawer" aria-label="Your cart" aria-hidden="true">
    <div class="drawer-head">
      <h2>Your cart</h2>
      <button class="x" data-cart-close aria-label="Close cart">×</button>
    </div>
    <div class="drawer-body" id="cart-lines"></div>
    <div class="drawer-foot" id="cart-foot"></div>
  </aside>`);

const drawer = $("#cart-drawer"), scrim = $(".drawer-scrim");
function openCart() { renderCart(); drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); scrim.hidden = false; $(".x", drawer).focus(); }
function closeCart() { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); scrim.hidden = true; }
document.addEventListener("click", e => {
  if (e.target.closest("[data-cart-open]")) { e.preventDefault(); openCart(); }
  if (e.target.closest("[data-cart-close]")) closeCart();
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && drawer.classList.contains("open")) closeCart(); });

function renderCart() {
  if (!CATALOG) return;
  const q = CartMath.priceCart(CATALOG, Cart.read(), "ship");
  $("#cart-lines").innerHTML = q.lines.length ? q.lines.map(l => `
    <div class="line">
      <img src="${IMG(l.img, 200)}" alt="">
      <div>
        <b>${esc(l.name)}</b>
        <div class="qty" data-id="${l.id}">
          <button data-step="-1" aria-label="One fewer ${esc(l.name)}">−</button>
          <span aria-live="polite">${l.qty}</span>
          <button data-step="1" aria-label="One more ${esc(l.name)}">+</button>
        </div>
      </div>
      <span class="amt">${money(l.lineCents)}</span>
    </div>`).join("") :
    `<p class="empty hand">your cart is empty… the octopus is lonely ✿</p><p style="text-align:center"><a class="btn ghost" href="shop.html">Browse the shop</a></p>`;

  const s = CATALOG.shipping;
  const toFree = s.freeOverCents ? s.freeOverCents - q.subtotal : 0;
  $("#cart-foot").innerHTML = q.lines.length ? `
    <div class="sum"><span>Subtotal</span><b>${money(q.subtotal)}</b></div>
    <p class="note">${toFree > 0 ? `Add ${money(toFree)} more for free shipping.` : "You've got free shipping! ✿"}${s.localPickup ? " Local pickup in Newport is always free." : ""}</p>
    <a class="btn checkout-btn" href="checkout.html">Check out</a>` : "";
}

$("#cart-lines").addEventListener("click", e => {
  const b = e.target.closest("button[data-step]"); if (!b) return;
  const id = b.closest(".qty").dataset.id;
  const cur = Cart.read().find(i => i.id === id);
  if (cur) Cart.set(id, Math.min(CartMath.MAX_QTY, cur.qty + Number(b.dataset.step)));
});

function updateCount() { $$("[data-cart-count]").forEach(el => { const n = Cart.count(); el.textContent = n; el.hidden = !n; }); }
document.addEventListener("cart:change", () => { updateCount(); if (drawer.classList.contains("open")) renderCart(); });
window.addEventListener("storage", e => { if (e.key === Cart.KEY) document.dispatchEvent(new CustomEvent("cart:change")); });
updateCount();

/* ---------- products (shop page shows all, sold-out last; home shows data-limit, available only) ---------- */
const productGrid = $("#products");
if (productGrid) catalogReady.then(cat => {
  const limit = Number(productGrid.dataset.limit);
  const list = limit
    ? cat.products.filter(p => !p.soldOut).slice(0, limit)
    : [...cat.products.filter(p => !p.soldOut), ...cat.products.filter(p => p.soldOut)];
  productGrid.innerHTML = list.map(p => `
    <article class="card${p.soldOut ? " sold" : ""}" data-kind="${p.kind}">
      <div class="img"><img loading="lazy" src="${IMG(p.img)}" alt="${esc(p.name)}, ${kindLabel[p.kind]} by Rachel Martino">${p.soldOut ? `<span class="sold-stamp">Sold out</span>` : ""}</div>
      <div class="body">
        <span class="kind">${esc(p.label || kindLabel[p.kind])}</span>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.blurb)}</p>
        <div class="row">
          ${p.soldOut
            ? `<a class="btn ghost" href="contact.html?about=${encodeURIComponent(p.name)}">Ask about this piece</a>`
            : `<span class="price">${money(p.priceCents)}</span>
               <button class="btn" data-add="${p.id}">Add to cart</button>`}
        </div>
      </div>
    </article>`).join("");
});

document.addEventListener("click", e => {
  const b = e.target.closest("[data-add]"); if (!b) return;
  Cart.add(b.dataset.add);
  b.textContent = "Added ✿"; b.classList.add("added");
  setTimeout(() => { b.textContent = "Add to cart"; b.classList.remove("added"); }, 1400);
  openCart();
});

catalogReady.then(cat => $$(".chip[data-filter]").forEach(chip => {
  const f = chip.dataset.filter;
  chip.hidden = f !== "all" && !cat.products.some(p => p.kind === f);
}));
$$(".chip").forEach(chip => chip.addEventListener("click", () => {
  $$(".chip").forEach(c => c.setAttribute("aria-pressed", c === chip));
  const f = chip.dataset.filter;
  $$(".card").forEach(c => c.hidden = f !== "all" && c.dataset.kind !== f);
}));

/* ---------- gallery + lightbox ---------- */
const galleryCols = $("#gallery-cols");
if (galleryCols) {
  galleryCols.innerHTML = GALLERY.map(([id, cap, big]) => `
    <figure${big ? ' class="big"' : ""}><button data-id="${id}" data-cap="${esc(cap)}" aria-label="Enlarge: ${esc(cap)}">
      <img loading="lazy" src="${IMG(id)}" alt="${esc(cap)}">
    </button><figcaption>${esc(cap)}</figcaption></figure>`).join("");
  pressify("#gallery-cols figure");

  const lb = $("#lightbox");
  galleryCols.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    $("img", lb).src = IMG(b.dataset.id, 1600);
    $("img", lb).alt = b.dataset.cap;
    $("p", lb).textContent = b.dataset.cap;
    lb.showModal();
  });
  lb.addEventListener("click", e => { if (e.target === lb || e.target.classList.contains("x")) lb.close(); });
}

/* ---------- mobile nav ---------- */
const mb = $(".menu-btn"), nav = $("#nav");
mb.addEventListener("click", () => { const o = nav.classList.toggle("open"); mb.setAttribute("aria-expanded", o); });

/* ---------- newsletter: opens a pre-filled email until Square Marketing / Mailchimp is hooked up ---------- */
const listForm = $("#list-form");
if (listForm) listForm.addEventListener("submit", e => {
  e.preventDefault();
  const em = $("#email").value;
  location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Add me to the list!")}&body=${encodeURIComponent("Please add " + em + " to the Rachel Martino Art mailing list.")}`;
  const m = $("#list-msg"); m.hidden = false; m.textContent = "yay! welcome to the inky little club ✿";
});

/* ---------- markets calendar ----------
   Events come from Rachel's own calendar app via the /events function.
   markets.html shows a month calendar + "coming up" list; the home page
   shows just the next date. */
const eventsBox = $("#events"), calBox = $("#calendar"), nextBox = $("[data-next-event]");
if (eventsBox || calBox || nextBox) {
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const MONTH = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const WDAY = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const pad = n => String(n).padStart(2, "0");
  const isoOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const parts = iso => { const [y, m, d] = iso.split("-").map(Number); return { y, m, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }; };
  const clock = hm => { let [h, m] = hm.split(":").map(Number); const ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12; return m ? `${h}:${pad(m)}${ap}` : `${h}${ap}`; };
  const when = e => {
    if (e.endDate) { const a = parts(e.date), b = parts(e.endDate); return `${WDAY[a.wd]} ${MON[a.m - 1]} ${a.d} – ${WDAY[b.wd]} ${MON[b.m - 1]} ${b.d}`; }
    if (e.allDay || !e.start) return "All day";
    return e.end ? `${clock(e.start)} – ${clock(e.end)}` : clock(e.start);
  };
  const maps = loc => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;

  const now = new Date();
  const todayIso = isoOf(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const cal = { y: now.getFullYear(), m: now.getMonth() + 1, byDay: {} };
  const MAX_AHEAD = 11;                                           // months you can flip forward

  function renderCalendar() {
    if (!calBox) return;
    const { y, m, byDay } = cal;
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const monthsAhead = (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth());
    let cells = "";
    for (let i = 0; i < first; i++) cells += `<div class="day blank" aria-hidden="true"></div>`;
    for (let d = 1; d <= days; d++) {
      const iso = isoOf(y, m, d), evs = byDay[iso] || [];
      const cls = ["day", iso < todayIso ? "past" : "", iso === todayIso ? "today" : "", evs.length ? "has" : ""].join(" ").trim();
      const label = `${WDAY[(first + d - 1) % 7]} ${MONTH[m - 1]} ${d}${evs.length ? ": " + evs.map(e => e.title).join(", ") : ""}`;
      cells += evs.length
        ? `<button class="${cls}" data-day="${iso}" aria-label="${esc(label)}"><span class="n">${d}</span><span class="lbl">${esc(evs[0].title)}${evs.length > 1 ? ` +${evs.length - 1}` : ""}</span></button>`
        : `<div class="${cls}" aria-label="${esc(label)}"><span class="n">${d}</span></div>`;
    }
    calBox.innerHTML = `
      <div class="cal-head">
        <button class="cal-nav" data-cal="-1" aria-label="Previous month" ${monthsAhead <= 0 ? "disabled" : ""}>‹</button>
        <h2>${MONTH[m - 1]} <span>${y}</span></h2>
        <button class="cal-nav" data-cal="1" aria-label="Next month" ${monthsAhead >= MAX_AHEAD ? "disabled" : ""}>›</button>
      </div>
      <div class="cal-grid">
        ${WDAY.map(w => `<div class="dow" aria-hidden="true">${w[0]}<span>${w.slice(1)}</span></div>`).join("")}
        ${cells}
      </div>
      <p class="cal-key"><span class="swatch"></span> market day: tap for details</p>`;
  }

  if (calBox) calBox.addEventListener("click", e => {
    const nav = e.target.closest("[data-cal]");
    if (nav) {
      let m = cal.m + Number(nav.dataset.cal), y = cal.y;
      if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
      cal.y = y; cal.m = m; renderCalendar(); return;
    }
    const day = e.target.closest("[data-day]");
    if (day) {
      const card = document.getElementById("ev-" + day.dataset.day);
      if (card) { card.scrollIntoView({ behavior: "smooth", block: "center" }); card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash"); }
    }
  });

  renderCalendar();

  fetch("/.netlify/functions/events").then(r => r.json()).catch(() => ({ events: [] })).then(({ events = [] }) => {
    // mark every day an event covers (multi-day fairs too)
    for (const e of events) {
      const a = parts(e.date), b = parts(e.endDate || e.date);
      for (let t = Date.UTC(a.y, a.m - 1, a.d); t <= Date.UTC(b.y, b.m - 1, b.d); t += 864e5) {
        const dt = new Date(t), iso = isoOf(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
        (cal.byDay[iso] = cal.byDay[iso] || []).push(e);
      }
    }
    renderCalendar();

    if (nextBox && events.length) {
      const e = events[0], p = parts(e.date);
      nextBox.innerHTML = `<b>Next up:</b> ${WDAY[p.wd]} ${MON[p.m - 1]} ${p.d}, ${esc(e.title)}${e.location ? ` · ${esc(e.location.split(",")[0])}` : ""}`;
      nextBox.hidden = false;
    }
    if (!eventsBox) return;
    if (!events.length) { eventsBox.hidden = true; $("#events-empty").hidden = false; return; }

    let html = "", month = "";
    const seen = new Set();
    for (const e of events) {
      const p = parts(e.date), key = `${p.y}-${p.m}`;
      if (key !== month) { month = key; html += `<h3 class="month">${MONTH[p.m - 1]}${p.y !== now.getFullYear() ? " " + p.y : ""}</h3>`; }
      const id = seen.has(e.date) ? "" : `id="ev-${e.date}"`; seen.add(e.date);
      html += `
        <article class="event" ${id}>
          <div class="stamp-date" aria-hidden="true"><span>${MON[p.m - 1]}</span><b>${p.d}</b><span>${WDAY[p.wd]}</span></div>
          <div class="what">
            <h3>${esc(e.title)}</h3>
            <p class="meta"><span class="sr">${WDAY[p.wd]} ${MONTH[p.m - 1]} ${p.d}, </span>${when(e)}</p>
            ${e.location ? `<p class="meta"><a href="${maps(e.location)}" target="_blank" rel="noopener">📍 ${esc(e.location)}</a></p>` : ""}
            ${e.description ? `<p class="desc">${esc(e.description).replace(/\n/g, "<br>")}</p>` : ""}
            ${e.url ? `<p><a href="${esc(e.url)}" target="_blank" rel="noopener">Event details ↗</a></p>` : ""}
          </div>
        </article>`;
    }
    eventsBox.innerHTML = html;
  });
}

/* ---------- contact form ----------
   Opens the visitor's email app with the note filled in.
   To receive messages without that step, point the form's `action` at a
   form service (e.g. Formspree) and delete this handler. */
const noteForm = $("#contact-form");
// arriving from a sold-out piece's "Ask about this piece" button (contact.html?about=Swallowtail)
const askAbout = noteForm && new URLSearchParams(location.search).get("about");
if (askAbout) {
  noteForm.elements.topic.value = "A question about a piece";
  noteForm.elements.message.value = `Hi Rachel! I saw the ${askAbout.slice(0, 80)} is sold out. Will there be more, or something similar?`;
}
if (noteForm) noteForm.addEventListener("submit", e => {
  e.preventDefault();
  const d = new FormData(noteForm);
  const body = `${d.get("message")}\n\n— ${d.get("name")} (${d.get("email")})`;
  location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`[${d.get("topic")}] from ${d.get("name")}`)}&body=${encodeURIComponent(body)}`;
  $("#sent").classList.add("show");
});

pressify(".hero-art .frame");   // polaroid-style photos only (gallery ones are added when it renders)

$$(".yr").forEach(el => el.textContent = new Date().getFullYear());
