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

    const body = await request.json().catch(() => ({}));
    const action = body?.action === "cancel" ? "cancel" : "manage";

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

    const returnUrl = `${getBaseUrl()}/pricing`;

    if (action === "cancel") {
      let subscriptionId = "";

      if (typeof privateMetadata.stripeSubscriptionId === "string") {
        subscriptionId = privateMetadata.stripeSubscriptionId;
      }

      if (!subscriptionId && typeof publicMetadata.subscription === "object") {
        const subMeta = publicMetadata.subscription as Record<string, unknown>;
        if (typeof subMeta.stripeSubscriptionId === "string") {
          subscriptionId = subMeta.stripeSubscriptionId;
        }
      }

      if (!subscriptionId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 10,
        });
        const activeSub = subscriptions.data.find(
          (item) => item.status === "active" || item.status === "trialing",
        );
        subscriptionId = activeSub?.id || subscriptions.data[0]?.id || "";
      }

      if (!subscriptionId) {
        return NextResponse.json(
          { error: "No subscription found to cancel." },
          { status: 400 },
        );
      }

      const cancelFlowSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
        flow_data: {
          type: "subscription_cancel",
          subscription_cancel: {
            subscription: subscriptionId,
          },
          after_completion: {
            type: "redirect",
            redirect: {
              return_url: `${returnUrl}?cancel=success`,
            },
          },
        },
      });

      return NextResponse.json({ url: cancelFlowSession.url });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
