import styles from "./PricingSection.module.css";

const plans = [
  {
    name: "Starter",
    price: "$0",
    period: "/mo",
    desc: "Perfect for exploring the platform and casual investors.",
    features: ["5 AI reports per month", "Basic technical indicators", "Daily market summary", "Email support"],
    featured: false,
  },
  {
    name: "Professional",
    price: "$49",
    period: "/mo",
    desc: "For active traders and serious investors who need an edge.",
    features: ["Unlimited AI reports", "Advanced analytics & charts", "Real-time alerts", "Portfolio risk scoring", "Priority support"],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "$199",
    period: "/mo",
    desc: "For teams and institutional investors needing full access.",
    features: ["Everything in Pro", "API access", "Custom models", "Dedicated account manager", "White-label reports"],
    featured: false,
  },
];

const PricingSection = () => (
  <section id="pricing" className={styles.section}>
    <div className={styles.container}>
      <div className={styles.textCenter}>
        <span className={styles.badge}>Pricing</span>
        <h2 className={styles.heading}>
          Simple, <span className={styles.headingAccent}>Transparent Pricing</span>
        </h2>
        <p className={styles.subtitle}>
          Choose the plan that fits your investment strategy. Upgrade or downgrade anytime.
        </p>
      </div>
      <div className={styles.grid}>
        {plans.map((plan, i) => (
          <div key={i} className={`${styles.card} ${plan.featured ? styles.featured : ""}`}>
            {plan.featured && <span className={styles.popularBadge}>Most Popular</span>}
            <p className={styles.planName}>{plan.name}</p>
            <p className={styles.price}>{plan.price}<span>{plan.period}</span></p>
            <p className={styles.planDesc}>{plan.desc}</p>
            <ul className={styles.featureList}>
              {plan.features.map((f, j) => <li key={j}>{f}</li>)}
            </ul>
            <button className={plan.featured ? styles.btnPrimary : styles.btnOutline}>
              Get Started
            </button>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default PricingSection;
