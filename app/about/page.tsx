import { Target, Zap } from "lucide-react";
import styles from "./about.module.css";

const About = () => {
  return (
    <div style={{ minHeight: "100vh", background: "hsl(222 47% 6%)" }}>
      {/* <SiteNavbar /> */}
      <section className={styles.section}>
        <div className={styles.glow1} />
        <div className={styles.glow2} />
        <div className={styles.container}>
          <span className={styles.badge}>About Us</span>
          <h1 className={styles.heading}>
            About <span className={styles.headingAccent}>AegisIQ</span>
          </h1>
          <p className={styles.subtitle}>
            We build AI-driven tools for analysts, investors, and research teams
            who need reliable insights without the manual grind.
          </p>

          <div className={styles.missionCard}>
            <h2 className={styles.cardTitle}>
              <span className={`${styles.cardIcon} ${styles.iconGold}`}>
                <Target size={20} />
              </span>
              Our Mission
            </h2>
            <p className={styles.cardDesc}>
              Deliver institutional-grade equity research at startup speed with
              trusted data, explainable insights, and modern workflows.
            </p>
          </div>

          <div className={styles.missionCard}>
            <h2 className={styles.cardTitle}>
              <span className={`${styles.cardIcon} ${styles.iconBlue}`}>
                <Zap size={20} />
              </span>
              Our Vision
            </h2>
            <p className={styles.cardDesc}>
              A world where every investor — from individual to institutional —
              has access to the same caliber of research and analytics, powered
              by transparent AI.
            </p>
          </div>

          <div className={styles.valuesGrid}>
            <div className={styles.valueCard}>
              <h3 className={styles.valueTitle}>🔍 Transparency</h3>
              <p className={styles.valueDesc}>
                Every insight is explainable. No black-box predictions — just
                clear, auditable analysis you can trust.
              </p>
            </div>
            <div className={styles.valueCard}>
              <h3 className={styles.valueTitle}>⚡ Speed</h3>
              <p className={styles.valueDesc}>
                Real-time data processing and AI models that deliver insights in
                seconds, not hours.
              </p>
            </div>
            <div className={styles.valueCard}>
              <h3 className={styles.valueTitle}>🛡️ Reliability</h3>
              <p className={styles.valueDesc}>
                Built on institutional-grade infrastructure with 99.9% uptime
                and enterprise security standards.
              </p>
            </div>
            <div className={styles.valueCard}>
              <h3 className={styles.valueTitle}>🤝 Accessibility</h3>
              <p className={styles.valueDesc}>
                Democratizing equity research so every investor can make
                informed, confident decisions.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
