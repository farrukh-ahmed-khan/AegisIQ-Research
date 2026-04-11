import { auth, createClerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { isStripeStatusActive } from "@/lib/subscription-access";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function toMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getStringValue(source: Record<string, unknown>, key: string): string {
  const value = source[key];
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
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const user = await clerk.users.getUser(userId);

    const publicMetadata = toMetadata(user.publicMetadata);
    const privateMetadata = toMetadata(user.privateMetadata);

    let customerId = getStringValue(publicMetadata, "stripeCustomerId");
    if (!customerId) {
      customerId = getStringValue(privateMetadata, "stripeCustomerId");
    }

    let targetSubscription: Stripe.Subscription | null = null;

    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (
        session.client_reference_id &&
        session.client_reference_id !== userId
      ) {
        return NextResponse.json(
          { error: "Invalid checkout session." },
          { status: 400 },
        );
      }

      if (typeof session.customer === "string") {
        customerId = session.customer;
      }

      if (typeof session.subscription === "string") {
        targetSubscription = await stripe.subscriptions.retrieve(
          session.subscription,
        );
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { active: false, reason: "No Stripe customer yet." },
        { status: 200 },
      );
    }

    if (!targetSubscription) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 10,
      });

      targetSubscription =
        subscriptions.data.find((item) => isStripeStatusActive(item.status)) ||
        subscriptions.data[0] ||
        null;
    }

    const status = targetSubscription?.status || "inactive";
    const active = isStripeStatusActive(status);

    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        stripeCustomerId: customerId,
        subscriptionActive: active,
        subscription: {
          active,
          status,
          stripeCustomerId: customerId,
          stripeSubscriptionId: targetSubscription?.id || "",
          currentPeriodEnd: targetSubscription?.current_period_end
            ? new Date(
                targetSubscription.current_period_end * 1000,
              ).toISOString()
            : null,
          planPriceId: targetSubscription?.items.data[0]?.price?.id || "",
          updatedAt: new Date().toISOString(),
        },
      },
      privateMetadata: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: targetSubscription?.id || "",
      },
    });

    return NextResponse.json({
      active,
      status,
      subscriptionId: targetSubscription?.id || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
