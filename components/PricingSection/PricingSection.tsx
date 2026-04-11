"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { hasActiveSubscriptionFromUserPublicMetadata } from "@/lib/subscription-access";
import styles from "./PricingSection.module.css";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

const plans = [
  {
    name: "Starter",
    price: "$0",
    period: "/mo",
    desc: "Perfect for exploring the platform and casual investors.",
    features: [
      "5 AI reports per month",
      "Basic technical indicators",
      "Daily market summary",
      "Email support",
    ],
    priceId: "",
    featured: false,
  },
  {
    name: "Professional",
    price: "$49",
    period: "/mo",
    desc: "For active traders and serious investors who need an edge.",
    features: [
      "Unlimited AI reports",
      "Advanced analytics & charts",
      "Real-time alerts",
      "Portfolio risk scoring",
      "Priority support",
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
    desc: "For teams and institutional investors needing full access.",
    features: [
      "Everything in Pro",
      "API access",
      "Custom models",
      "Dedicated account manager",
      "White-label reports",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || "",
    featured: false,
  },
];

const PricingSection = () => {
  const { isSignedIn, user } = useUser();

  const hasActiveSubscription = hasActiveSubscriptionFromUserPublicMetadata(
    user?.publicMetadata,
  );

  const publicMetadata = asRecord(user?.publicMetadata);
  const subscriptionMetadata = asRecord(publicMetadata.subscription);
  const activePlanPriceId =
    typeof subscriptionMetadata.planPriceId === "string"
      ? subscriptionMetadata.planPriceId
      : "";

  useEffect(() => {
    async function syncAfterCheckout() {
      if (!isSignedIn || !user) return;

      const searchParams = new URLSearchParams(window.location.search);

      const checkout = searchParams.get("checkout");
      if (checkout !== "success") return;

      const sessionId = searchParams.get("session_id") || "";

      await fetch("/api/stripe/sync-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      await user.reload();
    }

    syncAfterCheckout();
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
            Choose the plan that fits your investment strategy. Upgrade or
            downgrade anytime.
          </p>
        </div>
        <div className={styles.grid}>
          {plans?.map((plan, i) => (
            <div
              key={i}
              className={`${styles.card} ${plan?.featured ? styles.featured : ""}`}
            >
              {hasActiveSubscription && !!plan.priceId && !activePlanPriceId
                ? plan.featured
                : null}
              {plan?.featured && (
                <span className={styles.popularBadge}>Most Popular</span>
              )}
              <p className={styles.planName}>{plan.name}</p>
              <p className={styles.price}>
                {plan.price}
                <span>{plan.period}</span>
              </p>
              <p className={styles.planDesc}>{plan.desc}</p>
              <ul className={styles.featureList}>
                {plan.features.map((f, j) => (
                  <li key={j}>{f}</li>
                ))}
              </ul>

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
                  Manage or Cancel Subscription
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
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
