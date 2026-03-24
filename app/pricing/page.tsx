"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import styles from "./pricing.module.css";

type PricingCardProps = {
  title: string;
  price: string;
  description: string;
  priceId: string | undefined;
};

export default function PricingPage() {
  return (
    <main className={styles.page}>
      <div className={styles.glowBlue} />
      <div className={styles.glowGold} />

      <div className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.badge}>AegisIQ Pricing</div>
          <h1 className={styles.title}>Choose your research plan</h1>
          <p className={styles.subtitle}>
            Launch with single reports or upgrade to a recurring research
            workflow.
          </p>
        </section>

        <section className={styles.grid}>
          <PricingCard
            title="Single Report"
            price="$49"
            description="One full equity research workflow for a single ticker."
            priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_SINGLE}
          />

          <PricingCard
            title="Pro Monthly"
            price="$199/mo"
            description="Recurring access for active research and dashboard usage."
            priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO}
          />

          <div className={styles.card}>
            <h3 className={styles.planTitle}>Institutional</h3>
            <p className={styles.planPrice}>Custom</p>
            <p className={styles.planDesc}>
              Team deployment, branded reporting, API workflow, and enterprise
              setup.
            </p>
            <a href="/contact" className={styles.enterpriseLink}>
              Contact AegisIQ
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

function PricingCard({ title, price, description, priceId }: PricingCardProps) {
  const { isSignedIn } = useUser();

  async function handleCheckout() {
    if (!priceId) {
      alert("Pricing is not configured yet. Please contact support.");
      return;
    }

    const res = await fetch("/.netlify/functions/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ priceId }),
    });

    const json = await res.json();
    if (json.url) window.location.href = json.url;
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.planTitle}>{title}</h3>
      <p className={styles.planPrice}>{price}</p>
      <p className={styles.planDesc}>{description}</p>

      {!isSignedIn ? (
        <SignInButton mode="modal">
          <button className={styles.ctaButton}>Sign in to continue</button>
        </SignInButton>
      ) : (
        <button className={styles.ctaButton} onClick={handleCheckout}>
          Continue
        </button>
      )}
    </div>
  );
}
