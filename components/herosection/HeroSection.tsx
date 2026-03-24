"use client";
import { useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import styles from "./hero.module.css";

export default function HeroSection() {
  const [ticker, setTicker] = useState("");

  return (
    <section className={styles.hero}>
      <Image src="/assets/hero-bg.jpg" alt="" fill className={styles.bgImage} aria-hidden="true" />
      <div className={styles.overlayGradient} />
      <div className={styles.overlayTop} />
      <div className={styles.glowOrb1} />
      <div className={styles.glowOrb2} />

      <div className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.title}>
            AI-Powered <span className={styles.goldText}>Insights</span>
            <br />for Smarter Investment Decisions
          </h1>
          <p className={styles.subtitle}>
            Leverage the power of AI and advanced analytics to make informed, confident investment choices.
          </p>

          <div className={styles.buttons}>
            <button className={styles.ctaBtn}>Get Started</button>
            <button className={styles.demoBtn}><span>▶</span> Watch Demo</button>
          </div>

          <div className={styles.searchRow}>
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIcon} />
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="Enter ticker (e.g. AAPL)"
                className={styles.searchInput}
              />
            </div>
            <button className={styles.analyzeBtn}>Analyze</button>
          </div>
        </div>

        <div className={styles.imageWrapper}>
          <Image src="/assets/aegisiq-hero.png" alt="AegisIQ Dashboard" width={700} height={500} className={styles.dashboardImg} />
        </div>
      </div>
    </section>
  );
}
