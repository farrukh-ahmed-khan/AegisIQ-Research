import { auth, createClerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const LIVE_APP_URL = "https://aegisiq-researchs.netlify.app";

function getBaseUrl(): string {
  return LIVE_APP_URL;
}

function getPublicMetadataValue(
  publicMetadata: Record<string, unknown> | undefined,
  key: string,
): string {
  const value = publicMetadata?.[key];
  return typeof value === "string" ? value : "";
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

    const body = await request.json().catch(() => ({}));
    const priceId = typeof body?.priceId === "string" ? body.priceId : "";

    if (!priceId) {
      return NextResponse.json(
        { error: "Missing Stripe price id." },
        { status: 400 },
      );
    }

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const user = await clerk.users.getUser(userId);

    const firstEmail = user.emailAddresses.find(
      (item) => item.id === user.primaryEmailAddressId,
    );
    const email =
      firstEmail?.emailAddress || user.emailAddresses[0]?.emailAddress;

    if (!email) {
      return NextResponse.json(
        { error: "User email is required for checkout." },
        { status: 400 },
      );
    }

    const existingPublicMetadata =
      (user.publicMetadata as Record<string, unknown>) || {};
    const existingPrivateMetadata =
      (user.privateMetadata as Record<string, unknown>) || {};

    let customerId = getPublicMetadataValue(
      existingPublicMetadata,
      "stripeCustomerId",
    );
    if (!customerId) {
      const privateCustomerId = existingPrivateMetadata["stripeCustomerId"];
      if (typeof privateCustomerId === "string") {
        customerId = privateCustomerId;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          clerkUserId: userId,
        },
      });
      customerId = customer.id;
    }

    const baseUrl = getBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${baseUrl}/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?checkout=cancel`,
      subscription_data: {
        metadata: {
          clerkUserId: userId,
        },
      },
      metadata: {
        clerkUserId: userId,
      },
    });

    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        stripeCustomerId: customerId,
      },
      privateMetadata: {
        stripeCustomerId: customerId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
