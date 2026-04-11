import { auth, createClerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const LIVE_APP_URL = "https://aegisiq-researchs.netlify.app";

function getBaseUrl(): string {
  return LIVE_APP_URL;
}

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY is not configured." },
        { status: 500 },
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const user = await clerk.users.getUser(userId);
    const publicMetadata =
      (user.publicMetadata as Record<string, unknown>) || {};
    const privateMetadata =
      (user.privateMetadata as Record<string, unknown>) || {};

    let customerId = "";
    if (typeof publicMetadata.stripeCustomerId === "string") {
      customerId = publicMetadata.stripeCustomerId;
    } else if (typeof privateMetadata.stripeCustomerId === "string") {
      customerId = privateMetadata.stripeCustomerId;
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "No Stripe customer found for this account." },
        { status: 400 },
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getBaseUrl()}/pricing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
