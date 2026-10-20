# Rachel Martino Art: rachelmartinoart.com

Website for Rachel Martino, a block-print artist in Newport, Oregon. Shoppers browse, add to a cart and pay right on the site. Square processes the card behind the scenes, so orders and money land in Rachel's Square account like an in-person sale. Her market dates come straight from a calendar she keeps on her phone.

Plain HTML/CSS/JS with no build step, plus two small Netlify Functions.

```
public/                 the website (everything here is public)
  index.html, shop.html, about.html, gallery.html, markets.html, contact.html, checkout.html, 404.html
  styles.css            all styling
  site.js               cart, gallery, markets calendar, forms
  checkout.js           checkout page + Square card field
  catalog.js            PRODUCTS, PRICES & SHIPPING: the one place to edit them
  cart-math.js          cart totals (shared by the browser and the payment function)
  images/               her art (images/art), logo, credit logo
netlify/functions/
  pay.js                creates the Square order and charges the card
  config.js             gives checkout the public Square IDs
  events.js             reads the markets calendar
netlify.toml            tells Netlify: publish public/, functions in netlify/functions
```

## 1. Deploy (GitHub → Netlify)
1. Push this repo to GitHub.
2. In Netlify: **Add new site → Import an existing project → GitHub** and pick this repo. Leave the build settings blank, since `netlify.toml` already sets them.
3. Every push to `main` redeploys the site automatically.

> Don't use Netlify's drag-and-drop upload. It skips the functions, so checkout and the markets calendar won't work.

Preview locally (pages only, no payments/calendar): `python -m http.server 5510 --directory public`

## 2. Get Square keys
In the Square Developer dashboard (developer.squareup.com), signed in as Rachel:
1. Create an application (any name, e.g. "Website").
2. Copy the **Application ID** and **Access token**. Use **Sandbox** first for testing, then **Production**.
3. Under Locations, copy her **Location ID**.

## 3. Add them to Netlify
Site configuration → Environment variables:

| Name | Value |
|---|---|
| `SQUARE_APPLICATION_ID` | Application ID |
| `SQUARE_ACCESS_TOKEN` | Access token (secret: only here, never in the repo) |
| `SQUARE_LOCATION_ID` | Location ID |
| `SQUARE_ENVIRONMENT` | `sandbox` while testing, `production` when live |
| `CALENDAR_ICS_URL` | Markets calendar link (see "Markets calendar" below) |

Then **Deploys → Trigger deploy** so the functions pick them up.

Quick check after deploying:
- `/.netlify/functions/config` should show an `applicationId`, not an error
- `/.netlify/functions/events` should show `{"events":[...]}`

## 4. Test, then go live
With `sandbox`, pay using one of Square's sandbox test cards (search "Square sandbox test values" for the current list; Visa 4111 1111 1111 1111 with a future date is the usual one). The order should appear in the Sandbox Square dashboard. Then swap in the Production ID and token, set `SQUARE_ENVIRONMENT` to `production`, and redeploy.

## Markets calendar (markets.html)
The Markets page and the "Next up" line on the home page read straight from a calendar Rachel keeps on her phone.

**One-time setup (Google Calendar):**
1. In Google Calendar on a computer, create a new calendar called e.g. "Rachel Martino Art – Markets". Keep it separate from her personal calendar: everything on it shows on the website.
2. Open that calendar's Settings → "Integrate calendar" → copy **Secret address in iCal format**.
3. In Netlify → Environment variables, add `CALENDAR_ICS_URL` = that address. Redeploy.

(Apple Calendar works too: share the calendar as a **Public Calendar** and use that link. Any iCal/.ics link works.)

**Adding a market (Rachel, from her phone):** create an event on the Markets calendar.
- **Title:** the market name ("Newport Saturday Market")
- **Location:** an address or place name. The site turns it into a map link.
- **Time:** start and end time, or all-day. Multi-day fairs just span the days.
- **Repeat:** fine to use, e.g. every Saturday or the first Saturday of the month. To skip one week, delete just that one date.
- **Notes (optional):** shows under the event ("bringing the new octopus prints!"). Put an event website link in the URL field if there is one.

Changes show on the site within about 10 minutes. Past events disappear on their own. If the calendar is empty, the page says so and points people to the mailing list.

## Day to day
- **New orders** show in the Square Dashboard / Square app under Orders, with the shipping address or "pickup". Turn on order notifications in the Square app so Rachel gets alerted.
- **Products, prices, shipping:** edit `public/catalog.js` (prices in cents: 4500 = $45), commit, push. That's the only place prices live.
- **Sold out:** add `"soldOut": true` to a product in `catalog.js`. It stays in the shop (at the end) with a SOLD OUT stamp and an "Ask about this piece" button, and checkout won't sell it. Delete the line to restock.
- **Gallery:** edit the `GALLERY` list in `site.js`. To keep rows even, the number of regular (non-`true`) photos must be a multiple of 4.
- **Photos:** add to `public/images/art/` as `NAME-900.jpg` and `NAME-1600.jpg`, then reference `NAME` in `catalog.js` or the gallery list in `site.js`.
- **Refunds:** done in Square, as usual.

## Still placeholders (confirm with Rachel before launch)
- All 8 products, descriptions and prices in `catalog.js` (incl. how many cards are in the Tide Pool pack, and whether envelopes are included)
- Shipping: $6 flat, free over $75, free local pickup in Newport
- Are sold-out prints ever reprinted? (if not, Rachel may prefer them gallery-only)
- "10% off your first order": the sign-up form only emails Rachel; there's no discount code at checkout yet

---
Site built by [Hey AI, Help!](https://heyaihelp.com)
