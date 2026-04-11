import PricingSection from "@/components/PricingSection/PricingSection";
import styles from "./pricing.module.css";

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
            Same plans as home page, with identical pricing cards and feature
            details.
          </p>
        </section>

        <PricingSection />
      </div>
    </main>
  );
}
