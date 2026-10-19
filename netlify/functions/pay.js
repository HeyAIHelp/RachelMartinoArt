/* Takes the cart + a one-time card token from checkout.html, re-prices
   everything from catalog.js, creates the order in Rachel's Square
   account and charges the card. Card numbers never reach this code.

   Netlify environment variables (Site settings → Environment variables):
     SQUARE_ACCESS_TOKEN    secret, from the Square Developer dashboard
     SQUARE_LOCATION_ID     her Square location
     SQUARE_APPLICATION_ID  used by config.js
     SQUARE_ENVIRONMENT     "sandbox" for testing, "production" when live */
const catalog = require("../../public/catalog.js");
const { priceCart } = require("../../public/cart-math.js");

const SQUARE_VERSION = "2024-10-17";
const base = () => process.env.SQUARE_ENVIRONMENT === "production"
  ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";

const reply = (status, body) => ({ statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const FRIENDLY = {
  CARD_DECLINED: "Your card was declined. Please try another card.",
  GENERIC_DECLINE: "Your card was declined. Please try another card.",
  INSUFFICIENT_FUNDS: "Your card was declined for insufficient funds.",
  CVV_FAILURE: "The security code (CVV) didn't match. Please check it and try again.",
  ADDRESS_VERIFICATION_FAILURE: "The ZIP code didn't match your card. Please check it and try again.",
  INVALID_EXPIRATION: "The expiration date looks wrong. Please check it and try again.",
  INVALID_CARD: "That card number doesn't look right. Please check it and try again.",
};

async function square(path, body) {
  const res = await fetch(base() + path, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data.errors && data.errors[0]) || {};
    const e = new Error(FRIENDLY[err.code] || "We couldn't complete the payment. Your card was not charged.");
    e.detail = data.errors; e.status = res.status;
    throw e;
  }
  return data;
}

const clean = (v, max = 100) => String(v || "").trim().slice(0, max);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { error: "Method not allowed" });
  if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) return reply(503, { error: "Online payments aren't switched on yet." });

  let input;
  try { input = JSON.parse(event.body || "{}"); } catch { return reply(400, { error: "Bad request" }); }

  const c = input.customer || {};
  const method = input.method === "pickup" ? "pickup" : "ship";
  const cust = {
    firstName: clean(c.firstName, 60), lastName: clean(c.lastName, 60),
    email: clean(c.email, 254), phone: clean(c.phone, 30),
    address1: clean(c.address1), address2: clean(c.address2),
    city: clean(c.city, 60), state: clean(c.state, 2).toUpperCase(), zip: clean(c.zip, 10),
    note: clean(c.note, 200),
  };

  if (!input.sourceId || !input.idempotencyKey) return reply(400, { error: "Missing payment details." });
  if (!cust.firstName || !cust.lastName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cust.email)) return reply(400, { error: "Please fill in your name and a valid email." });
  if (method === "ship" && (!cust.address1 || !cust.city || !cust.state || !cust.zip)) return reply(400, { error: "Please fill in your full shipping address." });

  const q = priceCart(catalog, input.items, method);
  if (!q.lines.length) return reply(400, { error: "Your cart is empty." });
  if (Number(input.expectedTotal) !== q.total) return reply(409, { error: "Prices were updated since you loaded the page. Please refresh and try again." });

  const key = clean(input.idempotencyKey, 36);
  const name = `${cust.firstName} ${cust.lastName}`;
  const digits = cust.phone.replace(/\D/g, "");
  const phone = digits.length === 10 ? "+1" + digits : digits.length === 11 && digits[0] === "1" ? "+" + digits : undefined;
  const address = {
    address_line_1: cust.address1, address_line_2: cust.address2 || undefined,
    locality: cust.city, administrative_district_level_1: cust.state, postal_code: cust.zip,
    country: "US", first_name: cust.firstName, last_name: cust.lastName,
  };
  const recipient = { display_name: name, email_address: cust.email, phone_number: phone };

  try {
    const { order } = await square("/v2/orders", {
      idempotency_key: key + "-order",
      order: {
        location_id: process.env.SQUARE_LOCATION_ID,
        source: { name: "rachelmartinoart.com" },
        line_items: q.lines.map(l => ({
          name: l.name, quantity: String(l.qty),
          base_price_money: { amount: l.unitCents, currency: "USD" },
        })),
        service_charges: q.shipping ? [{
          name: "Shipping", amount_money: { amount: q.shipping, currency: "USD" }, calculation_phase: "SUBTOTAL_PHASE",
        }] : undefined,
        fulfillments: [method === "ship"
          ? { type: "SHIPMENT", state: "PROPOSED", shipment_details: { recipient: { ...recipient, address }, shipping_note: cust.note || undefined } }
          : { type: "PICKUP", state: "PROPOSED", pickup_details: {
              recipient, schedule_type: "SCHEDULED", note: cust.note || undefined,
              pickup_at: new Date(Date.now() + 2 * 864e5).toISOString(),
            } }],
      },
    });

    if (order.total_money.amount !== q.total) {
      console.error("Order total mismatch", order.total_money.amount, q.total);
      return reply(500, { error: "We couldn't total your order. Your card was not charged." });
    }

    const { payment } = await square("/v2/payments", {
      source_id: input.sourceId,
      idempotency_key: key,
      amount_money: { amount: q.total, currency: "USD" },
      order_id: order.id,
      location_id: process.env.SQUARE_LOCATION_ID,
      buyer_email_address: cust.email,
      shipping_address: method === "ship" ? address : undefined,
      note: `Website order (${method === "ship" ? "ship" : "local pickup"})${cust.note ? ": " + cust.note : ""}`.slice(0, 500),
      autocomplete: true,
    });

    return reply(200, { ok: true, orderId: order.id, receiptUrl: payment.receipt_url || null });
  } catch (e) {
    console.error("Square error", e.status, JSON.stringify(e.detail || e.message));
    return reply(e.status >= 400 && e.status < 500 ? 402 : 502, { error: e.message });
  }
};
