import Link from "next/link";
import styles from "./workspace.module.css";

const starterSymbols = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META"];

export default function WorkspaceIndexPage() {
  return (
    <main className={styles.page}>
      <div className={styles.glowBlue} />
      <div className={styles.glowGold} />

      <div className={styles.container}>
        <div className={styles.panel}>
          <div className={styles.badge}>AegisIQ Workspace</div>

          <h1 className={styles.title}>Company Workspace Terminal</h1>

          <p className={styles.subtitle}>
            Open a symbol-specific terminal to manage research notes, linked
            documents, valuation snapshots, and report generation from a single
            workspace.
          </p>

          <div className={styles.quickStart}>
            <h2 className={styles.quickStartTitle}>Quick Start</h2>

            <div className={styles.symbolGrid}>
              {starterSymbols.map((symbol) => (
                <Link
                  key={symbol}
                  href={`/workspace/${symbol}`}
                  className={styles.symbolLink}
                >
                  {symbol}
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.cards}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Workspace Core</h3>
              <p className={styles.cardText}>
                One terminal per coverage name with room for notes, documents,
                and activity.
              </p>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Report Integration</h3>
              <p className={styles.cardText}>
                Launch existing report generation, valuation, and AI analyst
                flows with symbol context.
              </p>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Schema Ready</h3>
              <p className={styles.cardText}>
                Database tables are prepared for live persistence in the next
                phase.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
