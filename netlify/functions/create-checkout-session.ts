import Stripe from "stripe";

export const handler = async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return response(405, { error: "Method not allowed." });
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const priceId = body.priceId;

    if (!priceId) {
      return response(400, { error: "Missing Stripe price id." });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?paid=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=1`,
      allow_promotion_codes: true,
    });

    return response(200, { url: session.url });
  } catch (error) {
    return response(500, { error: error.message || "Server error." });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
