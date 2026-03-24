import styles from "./HowItWorksSection.module.css";

const steps = [
  { num: "1", title: "Enter a Ticker", desc: "Simply type in any stock ticker to begin your research. Our AI instantly starts analyzing." },
  { num: "2", title: "AI Analyzes Data", desc: "Our models process financial statements, news sentiment, technical patterns, and market trends." },
  { num: "3", title: "Get Actionable Insights", desc: "Receive comprehensive research reports with ratings, price targets, and risk assessments." },
];

const HowItWorksSection = () => (
  <section className={styles.section}>
    <div className={styles.container}>
      <div className={styles.textCenter}>
        <span className={styles.badge}>How It Works</span>
        <h2 className={styles.heading}>
          Start Investing <span className={styles.headingAccent}>in 3 Simple Steps</span>
        </h2>
        <p className={styles.subtitle}>
          From ticker to insights in seconds — our AI handles the heavy lifting.
        </p>
      </div>
      <div className={styles.steps}>
        {steps.map((s, i) => (
          <div key={i} className={styles.step}>
            <div className={styles.stepNumber}>{s.num}</div>
            <h3 className={styles.stepTitle}>{s.title}</h3>
            <p className={styles.stepDesc}>{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
