import styles from "./CTASection.module.css";

const CTASection = () => (
  <section className={styles.section}>
    <div className={styles.glow1} />
    <div className={styles.glow2} />
    <div className={styles.container}>
      <h2 className={styles.heading}>
        Ready to Make <span className={styles.headingAccent}>Smarter Investments?</span>
      </h2>
      <p className={styles.subtitle}>
        Join thousands of investors who are already using AI-powered research to stay ahead of the market.
      </p>
      <div className={styles.buttons}>
        <button className={styles.btnPrimary}>Start Free Trial</button>
        <button className={styles.btnOutline}>Schedule a Demo</button>
      </div>
    </div>
  </section>
);

export default CTASection;
