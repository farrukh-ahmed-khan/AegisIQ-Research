"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./strategy.module.css";

type StrategyOutput = {
  summary: string;
  audience_selection_recommendation: string;
  timing_recommendation: string;
  content_variant_recommendations: string[];
  channel_mix_recommendation: string;
  campaign_risk_flags: string[];
  explainable_summary: string;
  best_next_actions: string[];
  top_performing_channel: string;
};

type StrategyCampaign = {
  campaign_id: string;
  company_name: string;
  ticker: string;
  status: string;
  compliance_state: string;
  strategy: StrategyOutput;
};

type StrategyPayload = {
  summary: {
    campaigns: number;
    total_risk_flags: number;
    campaigns_on_hold: number;
  };
  strategies: StrategyCampaign[];
};

export default function InvestorGrowthStrategyPage() {
  const [data, setData] = useState<StrategyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/investor-growth/strategy", {
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(payload.error || "Failed to load strategy summaries.");
        }

        setData((await response.json()) as StrategyPayload);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load strategy summaries.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>AI Strategy Engine</h1>
            <p className={styles.subtitle}>
              Campaign-level audience, timing, content, and channel recommendations with
              risk flags and explainable strategy summaries.
            </p>
          </div>
          <div className={styles.actions}>
            <Link href="/investor-growth" className={styles.link}>
              Dashboard
            </Link>
            <Link href="/investor-growth/analytics" className={styles.linkSecondary}>
              Analytics
            </Link>
            <Link href="/investor-growth/channels" className={styles.linkSecondary}>
              Channels
            </Link>
            <Link href="/investor-growth/enterprise" className={styles.linkSecondary}>
              Enterprise IR
            </Link>
          </div>
        </header>

        {error ? <p className={styles.error}>{error}</p> : null}

        <section className={styles.summaryGrid}>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Campaigns Analyzed</span>
            <strong>{loading ? "--" : (data?.summary.campaigns ?? 0)}</strong>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Total Risk Flags</span>
            <strong>{loading ? "--" : (data?.summary.total_risk_flags ?? 0)}</strong>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Campaigns on Hold</span>
            <strong>{loading ? "--" : (data?.summary.campaigns_on_hold ?? 0)}</strong>
          </article>
        </section>

        <h2 className={styles.sectionTitle}>Campaign Strategy Recommendations</h2>

        <section className={styles.strategyGrid}>
          {loading ? (
            <p className={styles.empty}>Generating strategy summaries...</p>
          ) : null}

          {!loading && data?.strategies.length === 0 ? (
            <p className={styles.empty}>
              No campaigns found. Create a campaign to see AI strategy recommendations.
            </p>
          ) : null}

          {!loading &&
            data?.strategies.map((item) => (
              <article key={item.campaign_id} className={styles.strategyCard}>
                <div className={styles.cardTop}>
                  <div>
                    <h2 className={styles.cardTitle}>
                      {item.company_name || item.ticker || "Campaign"}
                    </h2>
                    <p className={styles.cardMeta}>
                      {item.ticker || "No ticker"} &bull;{" "}
                      {item.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <span
                      className={`${styles.statusBadge} ${item.compliance_state === "hold" ? styles.holdBadge : ""}`}
                    >
                      {item.compliance_state === "hold" ? "On Hold" : item.compliance_state}
                    </span>
                    <Link
                      href={`/investor-growth/campaigns/${item.campaign_id}`}
                      className={styles.linkSecondary}
                      style={{ padding: "4px 12px", fontSize: "0.85rem" }}
                    >
                      Open
                    </Link>
                  </div>
                </div>

                <p className={styles.summarySentence}>{item.strategy.summary}</p>

                <div className={styles.strategyBody}>
                  <div className={styles.strategySection}>
                    <p className={styles.strategyLabel}>Audience Recommendation</p>
                    <p className={styles.strategyValue}>
                      {item.strategy.audience_selection_recommendation}
                    </p>
                  </div>

                  <div className={styles.strategySection}>
                    <p className={styles.strategyLabel}>Timing Recommendation</p>
                    <p className={styles.strategyValue}>
                      {item.strategy.timing_recommendation}
                    </p>
                  </div>

                  <div className={styles.strategySection}>
                    <p className={styles.strategyLabel}>Channel Mix</p>
                    <p className={styles.strategyValue}>
                      {item.strategy.channel_mix_recommendation || "email"}
                    </p>
                    <p className={styles.strategyLabel} style={{ marginTop: "4px" }}>
                      Top Performing Channel
                    </p>
                    <p className={styles.strategyValue}>
                      {item.strategy.top_performing_channel}
                    </p>
                  </div>

                  <div className={styles.strategySection}>
                    <p className={styles.strategyLabel}>Content Variants</p>
                    <ul className={styles.variantList}>
                      {item.strategy.content_variant_recommendations.map(
                        (variant, index) => (
                          <li key={index}>{variant}</li>
                        ),
                      )}
                    </ul>
                  </div>

                  <div className={styles.strategySection}>
                    <p className={styles.strategyLabel}>Best Next Actions</p>
                    <ul className={styles.actionList}>
                      {item.strategy.best_next_actions.map((action, index) => (
                        <li key={index}>{action}</li>
                      ))}
                    </ul>
                  </div>

                  <div className={styles.strategySection}>
                    <p className={styles.strategyLabel}>Campaign Risk Flags</p>
                    {item.strategy.campaign_risk_flags.length === 0 ? (
                      <p className={styles.noRisk}>No risk flags detected.</p>
                    ) : (
                      <ul className={styles.riskList}>
                        {item.strategy.campaign_risk_flags.map((flag, index) => (
                          <li key={index} className={styles.riskItem}>
                            <span className={styles.riskIcon}>!</span>
                            <span>{flag}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className={styles.explainLabel}>Explainable Strategy Summary</div>
                <div className={styles.explainBox}>{item.strategy.explainable_summary}</div>
              </article>
            ))}
        </section>
      </div>
    </main>
  );
}
