"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { hasActiveSubscriptionFromUserPublicMetadata } from "@/lib/subscription-access";
import styles from "./PricingSection.module.css";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function formatDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const plans = [
  {
    name: "Free",
    price: "Free",
    period: "",
    desc: "Best for trying AegisIQ basics before unlocking premium research workflows.",
    features: [
      "Access to public pages (Home, Features, Pricing, About, Contact)",
      "Create account and sign in",
      "View pricing and start checkout",
      "Premium research and investor-growth routes are locked",
    ],
    priceId: "",
    featured: false,
  },
  {
    name: "Professional",
    price: "$49",
    period: "/mo",
    desc: "For individual operators who need full research + investor growth execution.",
    features: [
      "Unlock Reports and Research Dashboard",
      "Unlock AI Report Builder and Workspace tools",
      "Unlock Investor Growth: Campaign Dashboard, Channel Execution, Posting Calendar",
      "Unlock Investor Contacts, Investor Segments, Approval Queue",
      "Manage or cancel anytime from Billing Portal",
    ],
    priceId:
      process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ||
      process.env.NEXT_PUBLIC_STRIPE_PRICE_SINGLE ||
      "",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "$199",
    period: "/mo",
    desc: "For teams that need enterprise controls, rollout support, and custom workflows.",
    features: [
      "Everything in Pro",
      "Priority onboarding and implementation support",
      "Team-level adoption and workflow guidance",
      "Custom integrations and process tuning",
      "Dedicated account partnership",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || "",
    featured: false,
  },
];

const PricingSection = () => {
  const { isSignedIn, user } = useUser();
  const syncedOnceRef = useRef(false);

  const hasActiveSubscription = hasActiveSubscriptionFromUserPublicMetadata(
    user?.publicMetadata,
  );

  const publicMetadata = asRecord(user?.publicMetadata);
  const subscriptionMetadata = asRecord(publicMetadata.subscription);
  const activePlanPriceId =
    typeof subscriptionMetadata.planPriceId === "string"
      ? subscriptionMetadata.planPriceId
      : "";
  const subscriptionStatus = asString(subscriptionMetadata.status);
  const subscribedAt = formatDate(asString(subscriptionMetadata.startedAt));
  const currentPeriodEnd = formatDate(
    asString(subscriptionMetadata.currentPeriodEnd),
  );
  const cancelAt = formatDate(asString(subscriptionMetadata.cancelAt));
  const canceledAt = formatDate(asString(subscriptionMetadata.canceledAt));
  const endedAt = formatDate(asString(subscriptionMetadata.endedAt));
  const cancelAtPeriodEnd = asBoolean(subscriptionMetadata.cancelAtPeriodEnd);
  const statusLabel =
    subscriptionStatus || (hasActiveSubscription ? "active" : "inactive");

  useEffect(() => {
    async function syncSubscriptionState() {
      if (!isSignedIn || !user) return;
      if (syncedOnceRef.current) return;
      syncedOnceRef.current = true;

      const searchParams = new URLSearchParams(window.location.search);
      const sessionId = searchParams.get("session_id") || "";

      await fetch("/api/stripe/sync-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      await user.reload();
    }

    syncSubscriptionState();
  }, [isSignedIn, user]);

  async function startCheckout(priceId: string) {
    if (!priceId) {
      alert("This plan is not configured yet. Please contact support.");
      return;
    }

    const res = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });

    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Unable to start checkout.");
      return;
    }

    if (json.url) {
      window.location.href = json.url;
    }
  }

  async function openBillingPortal() {
    const res = await fetch("/api/stripe/create-billing-portal-session", {
      method: "POST",
    });

    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Unable to open subscription management.");
      return;
    }

    if (json.url) {
      window.location.href = json.url;
    }
  }

  return (
    <section id="pricing" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.textCenter}>
          <span className={styles.badge}>Pricing</span>
          <h2 className={styles.heading}>
            Simple,
            <span className={styles.headingAccent}>Transparent Pricing</span>
          </h2>
          <p className={styles.subtitle}>
            Buy a plan to unlock premium product routes and operational
            workflows. Upgrade or downgrade anytime.
          </p>
          <p className={styles.accessNote}>
            Paid access unlocks: <strong>/reports</strong>,
            <strong> /report/*</strong>, <strong>/workspace/*</strong>, and
            <strong> /investor-growth/*</strong> including Campaign Dashboard,
            Channel Execution, Posting Calendar, Investor Contacts, Investor
            Segments, and Approval Queue.
          </p>
        </div>
        <div className={styles.grid}>
          {plans?.map((plan, i) => {
            const isSubscribedPlan =
              !!plan.priceId &&
              (activePlanPriceId === plan.priceId ||
                (!activePlanPriceId && plan.featured));

            return (
              <div
                key={i}
                className={`${styles.card} ${plan?.featured ? styles.featured : ""}`}
              >
                {plan?.featured && (
                  <span className={styles.popularBadge}>Most Popular</span>
                )}
                <p className={styles.planName}>{plan.name}</p>
                <p className={styles.price}>
                  {plan.price}
                  {plan.period ? <span>{plan.period}</span> : null}
                </p>
                <p className={styles.planDesc}>{plan.desc}</p>
                <ul className={styles.featureList}>
                  {plan.features.map((f, j) => (
                    <li key={j}>{f}</li>
                  ))}
                </ul>

                {isSubscribedPlan ? (
                  <div className={styles.subscriptionMeta}>
                    <p className={styles.subscriptionMetaItem}>
                      Status: {statusLabel}
                    </p>
                    {hasActiveSubscription && cancelAtPeriodEnd ? (
                      <p
                        className={`${styles.subscriptionMetaItem} ${styles.subscriptionMetaWarn}`}
                      >
                        Active until current cycle ends
                      </p>
                    ) : null}
                    {subscribedAt ? (
                      <p className={styles.subscriptionMetaItem}>
                        Subscribed on: {subscribedAt}
                      </p>
                    ) : null}
                    {hasActiveSubscription &&
                    cancelAtPeriodEnd &&
                    currentPeriodEnd ? (
                      <p
                        className={`${styles.subscriptionMetaItem} ${styles.subscriptionMetaWarn}`}
                      >
                        Cancellation scheduled. Access until: {currentPeriodEnd}
                      </p>
                    ) : null}
                    {hasActiveSubscription &&
                    !cancelAtPeriodEnd &&
                    currentPeriodEnd ? (
                      <p className={styles.subscriptionMetaItem}>
                        Current period ends: {currentPeriodEnd}
                      </p>
                    ) : null}
                    {!hasActiveSubscription &&
                    (endedAt || canceledAt || currentPeriodEnd) ? (
                      <p className={styles.subscriptionMetaItem}>
                        Subscription ended:{" "}
                        {endedAt || canceledAt || currentPeriodEnd}
                      </p>
                    ) : null}
                    {!hasActiveSubscription && cancelAt ? (
                      <p className={styles.subscriptionMetaItem}>
                        Cancel requested on: {cancelAt}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {hasActiveSubscription && !plan.priceId ? (
                  <button
                    className={
                      plan.featured ? styles.btnPrimary : styles.btnOutline
                    }
                    disabled
                  >
                    Included Plan
                  </button>
                ) : null}

                {hasActiveSubscription &&
                !!plan.priceId &&
                (activePlanPriceId === plan.priceId ||
                  (!activePlanPriceId && plan.featured)) ? (
                  <button
                    className={
                      plan.featured ? styles.btnPrimary : styles.btnOutline
                    }
                    onClick={openBillingPortal}
                  >
                    Cancel Subscription
                  </button>
                ) : null}

                {hasActiveSubscription &&
                !!plan.priceId &&
                !!activePlanPriceId &&
                activePlanPriceId !== plan.priceId ? (
                  <button
                    className={
                      plan.featured ? styles.btnPrimary : styles.btnOutline
                    }
                    onClick={openBillingPortal}
                  >
                    Change Plan in Billing Portal
                  </button>
                ) : null}

                {!isSignedIn ? (
                  <SignInButton mode="modal">
                    <button
                      className={
                        plan.featured ? styles.btnPrimary : styles.btnOutline
                      }
                    >
                      Sign in to Purchase
                    </button>
                  </SignInButton>
                ) : !hasActiveSubscription && plan.priceId ? (
                  <button
                    className={
                      plan.featured ? styles.btnPrimary : styles.btnOutline
                    }
                    onClick={() => startCheckout(plan.priceId)}
                  >
                    Purchase
                  </button>
                ) : !hasActiveSubscription ? (
                  <a
                    href="/contact"
                    className={
                      plan.featured ? styles.btnPrimary : styles.btnOutline
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textDecoration: "none",
                    }}
                  >
                    Contact Sales
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
