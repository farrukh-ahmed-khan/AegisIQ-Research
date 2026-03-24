import {
  BarChart3,
  FileText,
  FolderKanban,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import styles from "./features.module.css";

const featureCards = [
  {
    title: "Research Studio",
    description:
      "Guided workflows for thesis building, peer comps, scenario analysis, and investment memos.",
    icon: FolderKanban,
    tone: "blue",
  },
  {
    title: "Auto-Generated PDFs",
    description:
      "Export clean, brand-ready research reports with valuation, risks, and catalysts in minutes.",
    icon: FileText,
    tone: "gold",
  },
  {
    title: "Team Workspace",
    description:
      "Share notes, upload supporting documents, and keep analyst collaboration centralized.",
    icon: Sparkles,
    tone: "blue",
  },
  {
    title: "Real-Time Market Context",
    description:
      "Track key market moves, trend shifts, and event-driven changes as you build a view.",
    icon: BarChart3,
    tone: "gold",
  },
  {
    title: "Risk Controls",
    description:
      "Surface downside drivers and stress assumptions to pressure-test recommendations.",
    icon: ShieldCheck,
    tone: "blue",
  },
  {
    title: "Fast Research Delivery",
    description:
      "Move from raw filings to presentation-ready output with automation at each step.",
    icon: Zap,
    tone: "gold",
  },
];

export default function FeaturesPage() {
  return (
    <main className={styles.page}>
      <div className={styles.glowBlue} />
      <div className={styles.glowGold} />

      <section className={styles.container}>
        <div className={styles.hero}>
          <span className={styles.badge}>Platform Features</span>
          <h1 className={styles.title}>
            Everything Needed for{" "}
            <span className={styles.titleAccent}>
              Institutional-Grade Research
            </span>
          </h1>
          <p className={styles.subtitle}>
            AegisIQ helps teams generate institutional-grade equity research
            faster with automated data ingestion, analysis, and report
            generation.
          </p>
        </div>

        <div className={styles.grid}>
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className={styles.card}>
                <span
                  className={`${styles.iconWrap} ${feature.tone === "blue" ? styles.iconBlue : styles.iconGold}`}
                >
                  <Icon size={20} />
                </span>
                <h2 className={styles.cardTitle}>{feature.title}</h2>
                <p className={styles.cardDesc}>{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
