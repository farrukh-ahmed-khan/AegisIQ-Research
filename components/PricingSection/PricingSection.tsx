"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import {
  hasActiveSubscriptionFromUserPublicMetadata,
  getPlanFromPublicMetadata,
} from "@/lib/subscription-access";
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

type BillingPeriod = "monthly" | "annual";

const PLANS = {
  monthly: [
    {
      name: "Starter",
      tier: "starter",
      price: "$99",
      period: "/mo",
      billedAs: null,
      seats: "1 seat",
      desc: "Best for solo operators who need core research and intelligence tools.",
      features: [
        "Reports (read access)",
        "AI Report Builder (3 reports/month)",
        "Research Dashboard & Watchlist",
        "Community support",
      ],
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY || "",
      featured: false,
      isEnterprise: false,
    },
    {
      name: "Pro",
      tier: "pro",
      price: "$499",
      period: "/mo",
      billedAs: null,
      seats: "3 seats included",
      desc: "For teams that need full campaign execution and investor CRM.",
      features: [
        "Everything in Starter, unlimited AI reports",
        "Campaign Dashboard & AI Campaign Generation",
        "Channel Execution (Email / SMS / Social)",
        "Posting Calendar",
        "Investor Contacts, Segments & CRM Timeline",
        "Approval Queue (standard single-step)",
        "Campaign Analytics & Standard Exports",
        "Standard support",
      ],
      priceId:
        process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY ||
        process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ||
        process.env.NEXT_PUBLIC_STRIPE_PRICE_SINGLE ||
        "",
      featured: true,
      isEnterprise: false,
    },
    {
      name: "Enterprise",
      tier: "enterprise",
      price: "$2,500",
      period: "/mo",
      billedAs: null,
      seats: "Custom seats",
      desc: "For organizations that need compliance, multi-step approvals, and advanced integrations.",
      features: [
        "Everything in Pro",
        "Multi-step Approval Workflows",
        "Compliance Hold States & Role-based Permissions",
        "IR Analytics Workspace",
        "Audit-ready & Board-level Exports",
        "External Enrichment Connectors",
        "CRM & API Integrations, Deal Room Hooks",
        "Priority support + onboarding",
      ],
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY || process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || "",
      featured: false,
      isEnterprise: true,
    },
  ],
  annual: [
    {
      name: "Starter",
      tier: "starter",
      price: "$79",
      period: "/mo",
      billedAs: "Billed as $948/year",
      seats: "1 seat",
      desc: "Best for solo operators who need core research and intelligence tools.",
      features: [
        "Reports (read access)",
        "AI Report Builder (3 reports/month)",
        "Research Dashboard & Watchlist",
        "Community support",
      ],
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_ANNUAL || "",
      featured: false,
      isEnterprise: false,
    },
    {
      name: "Pro",
      tier: "pro",
      price: "$399",
      period: "/mo",
      billedAs: "Billed as $4,788/year",
      seats: "3 seats included",
      desc: "For teams that need full campaign execution and investor CRM.",
      features: [
        "Everything in Starter, unlimited AI reports",
        "Campaign Dashboard & AI Campaign Generation",
        "Channel Execution (Email / SMS / Social)",
        "Posting Calendar",
        "Investor Contacts, Segments & CRM Timeline",
        "Approval Queue (standard single-step)",
        "Campaign Analytics & Standard Exports",
        "Standard support",
      ],
      priceId:
        process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL ||
        "",
      featured: true,
      isEnterprise: false,
    },
    {
      name: "Enterprise",
      tier: "enterprise",
      price: "$1,995",
      period: "/mo",
      billedAs: "Billed as $23,940/year",
      seats: "Custom seats",
      desc: "For organizations that need compliance, multi-step approvals, and advanced integrations.",
      features: [
        "Everything in Pro",
        "Multi-step Approval Workflows",
        "Compliance Hold States & Role-based Permissions",
        "IR Analytics Workspace",
        "Audit-ready & Board-level Exports",
        "External Enrichment Connectors",
        "CRM & API Integrations, Deal Room Hooks",
        "Priority support + onboarding",
      ],
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL || "",
      featured: false,
      isEnterprise: true,
    },
  ],
};

const PricingSection = () => {
  const { isSignedIn, user } = useUser();
  const syncedOnceRef = useRef(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  const hasActiveSubscription = hasActiveSubscriptionFromUserPublicMetadata(
    user?.publicMetadata,
  );
  const activePlanTier = getPlanFromPublicMetadata(user?.publicMetadata);

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
  const isCancellationScheduled = hasActiveSubscription && cancelAtPeriodEnd;
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
      body: JSON.stringify({ priceId, billingPeriod }),
    });

    const json = await res.json();

    // Enterprise blocked from self-serve — redirect to inquiry
    if (res.status === 403 && json.redirect) {
      window.location.href = json.redirect;
      return;
    }

    if (!res.ok) {
      alert(json.error || "Unable to start checkout.");
      return;
    }

    if (json.url) {
      window.location.href = json.url;
    }
  }

  async function openBillingPortal(action: "manage" | "cancel" = "manage") {
    const res = await fetch("/api/stripe/create-billing-portal-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
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

  const plans = PLANS[billingPeriod];

  return (
    <section id="pricing" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.textCenter}>
          <span className={styles.badge}>Pricing</span>
          <h2 className={styles.heading}>
            Simple,
            <span className={styles.headingAccent}> Transparent Pricing</span>
          </h2>
          <p className={styles.subtitle}>
            Choose the plan that fits your team. Upgrade or downgrade anytime.
          </p>

          {/* Annual/Monthly Toggle */}
          <div className={styles.billingToggle}>
            <button
              className={`${styles.toggleBtn} ${billingPeriod === "monthly" ? styles.toggleActive : ""}`}
              onClick={() => setBillingPeriod("monthly")}
            >
              Monthly
            </button>
            <button
              className={`${styles.toggleBtn} ${billingPeriod === "annual" ? styles.toggleActive : ""}`}
              onClick={() => setBillingPeriod("annual")}
            >
              Annual
              <span className={styles.savingsBadge}>Save ~20%</span>
            </button>
          </div>

          <p className={styles.accessNote}>
            Paid access unlocks: <strong>/reports</strong>,{" "}
            <strong>/report/*</strong>, <strong>/workspace/*</strong>, and{" "}
            <strong>/investor-growth/*</strong> — feature access depends on
            your plan tier.
          </p>
        </div>

        <div className={styles.grid}>
          {plans.map((plan, i) => {
            const isSubscribedPlan =
              hasActiveSubscription &&
              (activePlanTier === plan.tier ||
                (!!plan.priceId &&
                  (activePlanPriceId === plan.priceId ||
                    (!activePlanTier && !activePlanPriceId && plan.featured))));

            return (
              <div
                key={i}
                className={`${styles.card} ${plan.featured ? styles.featured : ""}`}
              >
                {plan.featured && (
                  <span className={styles.popularBadge}>Most Popular</span>
                )}
                <p className={styles.planName}>{plan.name}</p>
                <p className={styles.price}>
                  {plan.price}
                  {plan.period ? <span>{plan.period}</span> : null}
                </p>
                {plan.billedAs ? (
                  <p className={styles.billedAs}>{plan.billedAs}</p>
                ) : null}
                <p className={styles.seatsLabel}>{plan.seats}</p>
                <p className={styles.planDesc}>{plan.desc}</p>
                <ul className={styles.featureList}>
                  {plan.features.map((f, j) => (
                    <li key={j}>{f}</li>
                  ))}
                </ul>

                {/* Subscription metadata for current plan */}
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

                {/* CTA Buttons */}
                {plan.isEnterprise ? (
                  // Enterprise always goes to sales flow
                  isSubscribedPlan ? (
                    <a
                      href="/enterprise-inquiry"
                      className={styles.btnOutline}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textDecoration: "none",
                      }}
                    >
                      Contact Sales to Manage
                    </a>
                  ) : (
                    <a
                      href="/enterprise-inquiry"
                      className={styles.btnOutline}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textDecoration: "none",
                      }}
                    >
                      Talk to Sales
                    </a>
                  )
                ) : !isSignedIn ? (
                  <SignInButton mode="modal">
                    <button
                      className={
                        plan.featured ? styles.btnPrimary : styles.btnOutline
                      }
                    >
                      Sign in to Purchase
                    </button>
                  </SignInButton>
                ) : isSubscribedPlan ? (
                  isCancellationScheduled ? (
                    <>
                      <button
                        className={
                          plan.featured ? styles.btnPrimary : styles.btnOutline
                        }
                        disabled
                      >
                        Cancellation Scheduled
                      </button>
                      <button
                        className={
                          plan.featured ? styles.btnPrimary : styles.btnOutline
                        }
                        onClick={() => openBillingPortal("manage")}
                        style={{ marginTop: 8 }}
                      >
                        Resume or Manage Plan
                      </button>
                    </>
                  ) : (
                    <button
                      className={
                        plan.featured ? styles.btnPrimary : styles.btnOutline
                      }
                      onClick={() => openBillingPortal("cancel")}
                    >
                      Cancel Subscription
                    </button>
                  )
                ) : hasActiveSubscription && activePlanPriceId ? (
                  // Subscribed to a different plan — show change plan
                  <button
                    className={
                      plan.featured ? styles.btnPrimary : styles.btnOutline
                    }
                    onClick={() => openBillingPortal("manage")}
                  >
                    {isCancellationScheduled
                      ? "Resume or Change in Billing Portal"
                      : "Change Plan in Billing Portal"}
                  </button>
                ) : plan.priceId ? (
                  <button
                    className={
                      plan.featured ? styles.btnPrimary : styles.btnOutline
                    }
                    onClick={() => startCheckout(plan.priceId)}
                  >
                    Get Started
                  </button>
                ) : (
                  <button
                    className={
                      plan.featured ? styles.btnPrimary : styles.btnOutline
                    }
                    disabled
                  >
                    Contact Support
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className={styles.enterpriseNote}>
          Enterprise subscriptions are activated manually after deal close —
          no self-serve checkout.{" "}
          <a href="/enterprise-inquiry" className={styles.enterpriseLink}>
            Start the conversation →
          </a>
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
