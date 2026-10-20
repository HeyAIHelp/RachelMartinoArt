/* =====================================================================
   THE PRODUCT LIST: the one place to edit products, prices and shipping.
   Prices are in CENTS (4500 = $45.00). The checkout re-reads prices from
   this file on the server, so shoppers can't change what they pay.
   'img' is the photo name in images/art/. Optional 'label' replaces the
   small category line on the card (e.g. "holiday card pack").
   ===================================================================== */
(function (root) {
  const CATALOG = {
    "shipping": {
      "flatRateCents": 600,
      "freeOverCents": 7500,
      "localPickup": true,
      "pickupLabel": "Local pickup in Newport, OR (free, I'll email to arrange)"
    },
    "products": [
      {
        "id": "holiday-elk-pack",
        "name": "Holiday Elk Pack",
        "kind": "card",
        "label": "holiday card pack",
        "img": "holiday-elk",
        "priceCents": 3000,
        "blurb": "Two each of my three bestselling elk print cards. 4×6 folded, hand-printed."
      },
      {
        "id": "holiday-lights-pack",
        "name": "Holiday Lights Pack",
        "kind": "card",
        "label": "holiday card pack",
        "img": "holiday-lights",
        "priceCents": 3000,
        "blurb": "Six of my candle cards in assorted colors, hand-picked by me. 4×6 folded, hand-printed."
      },
      {
        "id": "holiday-gift-pack",
        "name": "Holiday Gift Pack",
        "kind": "card",
        "label": "holiday card pack",
        "img": "holiday-gift",
        "priceCents": 4000,
        "blurb": "Eight 4×6 hand-printed holiday cards in festive winter colors and designs. I pick them for you!"
      },
      {
        "id": "pacific-giant-octopus",
        "name": "Pacific Giant Octopus",
        "kind": "print",
        "img": "IMG_8837",
        "priceCents": 5500,
        "blurb": "Eight arms, one sunset gradient. Hand-pulled relief print."
      },
      {
        "id": "marigold-on-black",
        "name": "Marigold on Black",
        "kind": "card",
        "img": "IMG_9405",
        "priceCents": 700,
        "blurb": "Hand-printed marigolds on black. Blank inside for your own words."
      },
      {
        "id": "marigold-on-white",
        "name": "Marigold on White",
        "kind": "card",
        "img": "IMG_9865",
        "priceCents": 700,
        "blurb": "Hand-printed marigolds on white. Blank inside for your own words."
      },
      {
        "id": "forest-floor",
        "name": "Forest Floor",
        "kind": "card",
        "img": "IMG_9502",
        "priceCents": 700,
        "blurb": "Chanterelles and woodgrain: a love letter to fall foraging."
      }
    ]
  };
  if (typeof module === "object" && module.exports) module.exports = CATALOG;
  else root.RMA_CATALOG = CATALOG;
})(typeof self !== "undefined" ? self : this);
