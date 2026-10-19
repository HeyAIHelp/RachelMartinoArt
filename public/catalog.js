/* =====================================================================
   THE PRODUCT LIST: the one place to edit products, prices and shipping.
   Prices are in CENTS (4500 = $45.00). The checkout re-reads prices from
   this file on the server, so shoppers can't change what they pay.
   'img' is the photo name.
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
        "id": "swallowtail",
        "name": "Swallowtail",
        "kind": "print",
        "img": "IMG_8684",
        "priceCents": 4500,
        "blurb": "Hand-carved block print, butter yellow on bark-brown paper."
      },
      {
        "id": "octopus-of-the-bay",
        "name": "Octopus of the Bay",
        "kind": "print",
        "img": "IMG_8837",
        "priceCents": 5500,
        "blurb": "Eight arms, one sunset gradient. Hand-pulled relief print."
      },
      {
        "id": "marigold-patch",
        "name": "Marigold Patch",
        "kind": "card",
        "img": "IMG_9405",
        "priceCents": 700,
        "blurb": "Hand-printed greeting card, blank inside for your own words."
      },
      {
        "id": "poppy-bouquet",
        "name": "Poppy Bouquet",
        "kind": "card",
        "img": "IMG_9865",
        "priceCents": 700,
        "blurb": "Red-orange blooms printed on cream. Envelope included."
      },
      {
        "id": "whale-song",
        "name": "Whale Song",
        "kind": "print",
        "img": "IMG_9492",
        "priceCents": 4000,
        "blurb": "Humpbacks under a galaxy sky, printed over a hand-blended field."
      },
      {
        "id": "forest-floor",
        "name": "Forest Floor",
        "kind": "card",
        "img": "IMG_9502",
        "priceCents": 700,
        "blurb": "Chanterelles and woodgrain: a love letter to fall foraging."
      },
      {
        "id": "tide-pool-pack",
        "name": "Tide Pool Card Pack",
        "kind": "card",
        "img": "IMG_0158",
        "priceCents": 2400,
        "blurb": "A mixed bundle of sea creatures and botanicals. No two packs match."
      },
      {
        "id": "spiral-tee",
        "name": "Spiral Tie-Dye Tee",
        "kind": "apparel",
        "img": "IMG_9224",
        "priceCents": 3800,
        "blurb": "Hand-dyed cotton in a riot of color. Truly one of a kind."
      }
    ]
  };
  if (typeof module === "object" && module.exports) module.exports = CATALOG;
  else root.RMA_CATALOG = CATALOG;
})(typeof self !== "undefined" ? self : this);
