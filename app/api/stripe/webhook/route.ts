import { createClerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { isStripeStatusActive } from "@/lib/subscription-access";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function getWebhookSecret(): string {
  return process.env.WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || "";
}

function toUnixIso(value: number | null | undefined): string | null {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

async function updateClerkSubscription(
  clerkUserId: string,
  payload: {
    status: string;
    active: boolean;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    startedAt?: string | null;
    cancelAtPeriodEnd?: boolean;
    cancelAt?: string | null;
    canceledAt?: string | null;
    endedAt?: string | null;
    planPriceId?: string;
  },
) {
  if (!process.env.CLERK_SECRET_KEY) return;

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  await clerk.users.updateUserMetadata(clerkUserId, {
    publicMetadata: {
      subscriptionActive: payload.active,
      stripeCustomerId: payload.stripeCustomerId || "",
      subscription: {
        status: payload.status,
        active: payload.active,
        stripeSubscriptionId: payload.stripeSubscriptionId || "",
        stripeCustomerId: payload.stripeCustomerId || "",
        currentPeriodStart: payload.currentPeriodStart || null,
        currentPeriodEnd: payload.currentPeriodEnd || null,
        startedAt: payload.startedAt || null,
        cancelAtPeriodEnd: !!payload.cancelAtPeriodEnd,
        cancelAt: payload.cancelAt || null,
        canceledAt: payload.canceledAt || null,
        endedAt: payload.endedAt || null,
        planPriceId: payload.planPriceId || "",
        updatedAt: new Date().toISOString(),
      },
    },
    privateMetadata: {
      stripeCustomerId: payload.stripeCustomerId || "",
      stripeSubscriptionId: payload.stripeSubscriptionId || "",
    },
  });
}

function getClerkUserIdFromSubscription(
  subscription: Stripe.Subscription,
): string {
  const direct = subscription.metadata?.clerkUserId;
  return typeof direct === "string" ? direct : "";
}

async function getClerkUserIdFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<string> {
  const metadataId = session.metadata?.clerkUserId;
  if (typeof metadataId === "string" && metadataId) return metadataId;

  if (
    typeof session.client_reference_id === "string" &&
    session.client_reference_id
  ) {
    return session.client_reference_id;
  }

  if (!session.subscription || typeof session.subscription !== "string") {
    return "";
  }

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription,
  );
  return getClerkUserIdFromSubscription(subscription);
}

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY is not configured." },
        { status: 500 },
      );
    }

    const webhookSecret = getWebhookSecret();
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "WEBHOOK_SECRET is not configured." },
        { status: 500 },
      );
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature." },
        { status: 400 },
      );
    }

    const body = await request.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const clerkUserId = await getClerkUserIdFromCheckoutSession(session);

      if (clerkUserId && typeof session.subscription === "string") {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription,
        );
        const status = subscription.status;
        await updateClerkSubscription(clerkUserId, {
          status,
          active: isStripeStatusActive(status),
          stripeCustomerId:
            typeof subscription.customer === "string"
              ? subscription.customer
              : undefined,
          stripeSubscriptionId: subscription.id,
          currentPeriodStart: toUnixIso(subscription.current_period_start),
          currentPeriodEnd: toUnixIso(subscription.current_period_end),
          startedAt: toUnixIso(subscription.start_date),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          cancelAt: toUnixIso(subscription.cancel_at),
          canceledAt: toUnixIso(subscription.canceled_at),
          endedAt: toUnixIso(subscription.ended_at),
          planPriceId: subscription.items.data[0]?.price?.id || "",
        });
      }
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const clerkUserId = getClerkUserIdFromSubscription(subscription);

      if (clerkUserId) {
        const status = subscription.status;
        await updateClerkSubscription(clerkUserId, {
          status,
          active: isStripeStatusActive(status),
          stripeCustomerId:
            typeof subscription.customer === "string"
              ? subscription.customer
              : undefined,
          stripeSubscriptionId: subscription.id,
          currentPeriodStart: toUnixIso(subscription.current_period_start),
          currentPeriodEnd: toUnixIso(subscription.current_period_end),
          startedAt: toUnixIso(subscription.start_date),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          cancelAt: toUnixIso(subscription.cancel_at),
          canceledAt: toUnixIso(subscription.canceled_at),
          endedAt: toUnixIso(subscription.ended_at),
          planPriceId: subscription.items.data[0]?.price?.id || "",
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
