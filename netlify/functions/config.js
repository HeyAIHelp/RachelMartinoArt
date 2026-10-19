/* Hands checkout.html the PUBLIC Square ids it needs to draw the card field.
   The secret access token stays on the server (see pay.js). */
exports.handler = async () => {
  const applicationId = process.env.SQUARE_APPLICATION_ID || "";
  const locationId = process.env.SQUARE_LOCATION_ID || "";
  return {
    statusCode: applicationId && locationId ? 200 : 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ applicationId, locationId, environment: process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox" }),
  };
};
