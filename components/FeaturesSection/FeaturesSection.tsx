import { BarChart3, Brain, Shield, TrendingUp, Zap, Globe } from "lucide-react";
import styles from "./FeaturesSection.module.css";

const features = [
  { icon: <Brain size={24} />, title: "AI-Powered Analysis", desc: "Advanced machine learning models analyze thousands of data points to deliver actionable equity research.", color: "blue" },
  { icon: <BarChart3 size={24} />, title: "Real-Time Analytics", desc: "Live market data with interactive charts, candlestick patterns, and technical indicators updated in real-time.", color: "gold" },
  { icon: <Shield size={24} />, title: "Risk Assessment", desc: "Comprehensive risk scoring and portfolio stress testing to protect and optimize your investments.", color: "blue" },
  { icon: <TrendingUp size={24} />, title: "Predictive Forecasting", desc: "AI-driven price predictions and trend analysis using historical data and market sentiment.", color: "gold" },
  { icon: <Zap size={24} />, title: "Instant Alerts", desc: "Customizable alerts for price movements, volume spikes, and significant market events.", color: "blue" },
  { icon: <Globe size={24} />, title: "Global Coverage", desc: "Access equity research across major global markets including NYSE, NASDAQ, LSE, and more.", color: "gold" },
];

const FeaturesSection = () => (
  <section id="features" className={styles.section}>
    <div className={styles.container}>
      <div className={styles.textCenter}>
        <span className={styles.badge}>Features</span>
        <h2 className={styles.heading}>
          Everything You Need for <span className={styles.headingAccent}>Smarter Investing</span>
        </h2>
        <p className={styles.subtitle}>
          Our platform combines cutting-edge AI technology with comprehensive market data to give you an edge.
        </p>
      </div>
      <div className={styles.grid}>
        {features.map((f, i) => (
          <div key={i} className={styles.card}>
            <div className={`${styles.iconWrap} ${f.color === "blue" ? styles.iconBlue : styles.iconGold}`}>
              {f.icon}
            </div>
            <h3 className={styles.cardTitle}>{f.title}</h3>
            <p className={styles.cardDesc}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
