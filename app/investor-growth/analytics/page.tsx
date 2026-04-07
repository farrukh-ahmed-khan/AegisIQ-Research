"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./analytics.module.css";

type AnalyticsSnapshot = {
  campaign_id: string;
  company_name: string;
  ticker: string;
  analytics?: {
    metrics_json?: Record<string, unknown>;
    segment_metrics_json?: Record<string, unknown>;
    cohort_metrics_json?: Record<string, unknown>;
    top_content_json?: Record<string, unknown>;
    funnel_json?: Record<string, unknown>;
    trend_json?: Record<string, unknown>;
  } | null;
};

type AnalyticsPayload = {
  portfolio?: {
    totals?: {
      sent?: number;
      failed?: number;
      opens?: number;
      clicks?: number;
      replies?: number;
      engagement_score?: number;
    };
    top_content_panels?: Array<Record<string, unknown>>;
    trend_views?: Array<Record<string, unknown>>;
  };
  campaign_analytics?: AnalyticsSnapshot[];
};

function metricValue(source: Record<string, unknown> | undefined, key: string): string {
  const value = source?.[key];
  return value === undefined || value === null ? "0" : String(value);
}

export default function InvestorGrowthAnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/investor-growth/analytics", {
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(payload.error || "Failed to load analytics.");
        }

        setData((await response.json()) as AnalyticsPayload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    }

    void loadAnalytics();
  }, []);

  const totals = data?.portfolio?.totals;
  const snapshots = data?.campaign_analytics ?? [];

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Campaign Analytics</h1>
            <p className={styles.subtitle}>
              Compare delivery, engagement, funnels, and cohort performance across investor campaigns.
            </p>
          </div>
          <div className={styles.actions}>
            <Link href="/investor-growth" className={styles.link}>
              Dashboard
            </Link>
            <Link href="/investor-growth/channels" className={styles.linkSecondary}>
              Channels
            </Link>
          </div>
        </header>

        {error ? <p className={styles.error}>{error}</p> : null}

        <section className={styles.summaryGrid}>
          <article className={styles.metricCard}>
            <span>Sent</span>
            <strong>{loading ? "--" : totals?.sent ?? 0}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Failed</span>
            <strong>{loading ? "--" : totals?.failed ?? 0}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Opens / Clicks / Replies</span>
            <strong>
              {loading
                ? "--"
                : `${totals?.opens ?? 0}/${totals?.clicks ?? 0}/${totals?.replies ?? 0}`}
            </strong>
          </article>
          <article className={styles.metricCard}>
            <span>Engagement Score</span>
            <strong>{loading ? "--" : totals?.engagement_score ?? 0}</strong>
          </article>
        </section>

        <section className={styles.tableWrap}>
          {loading ? <p className={styles.empty}>Loading campaign analytics...</p> : null}
          {!loading && snapshots.length === 0 ? (
            <p className={styles.empty}>No analytics snapshots are available yet.</p>
          ) : null}

          {!loading && snapshots.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Delivery</th>
                  <th>Engagement</th>
                  <th>Segment Metrics</th>
                  <th>Cohort</th>
                  <th>Funnel</th>
                  <th>Top Content</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((snapshot) => (
                  <tr key={snapshot.campaign_id}>
                    <td>
                      <div className={styles.primaryCell}>
                        <strong>{snapshot.company_name || snapshot.ticker || "Campaign"}</strong>
                        <Link
                          href={`/investor-growth/campaigns/${snapshot.campaign_id}`}
                          className={styles.inlineLink}
                        >
                          Open campaign
                        </Link>
                      </div>
                    </td>
                    <td>
                      Sent {metricValue(snapshot.analytics?.metrics_json, "sent")}
                      <br />
                      Failed {metricValue(snapshot.analytics?.metrics_json, "failed")}
                      <br />
                      Conversion {metricValue(snapshot.analytics?.metrics_json, "approval_to_delivery_conversion")}%
                    </td>
                    <td>
                      Opens {metricValue(snapshot.analytics?.metrics_json, "opens")}
                      <br />
                      Clicks {metricValue(snapshot.analytics?.metrics_json, "clicks")}
                      <br />
                      Replies {metricValue(snapshot.analytics?.metrics_json, "replies")}
                    </td>
                    <td>
                      Score {metricValue(snapshot.analytics?.segment_metrics_json?.all_segments as Record<string, unknown>, "engagement_score")}
                      <br />
                      Sends {metricValue(snapshot.analytics?.segment_metrics_json?.all_segments as Record<string, unknown>, "sends")}
                    </td>
                    <td>
                      Send rate {metricValue(snapshot.analytics?.cohort_metrics_json?.current_campaign as Record<string, unknown>, "send_rate")}%
                      <br />
                      Failure rate {metricValue(snapshot.analytics?.cohort_metrics_json?.current_campaign as Record<string, unknown>, "failure_rate")}%
                    </td>
                    <td>
                      Approvals {metricValue(snapshot.analytics?.funnel_json, "approvals")}
                      <br />
                      Scheduled {metricValue(snapshot.analytics?.funnel_json, "scheduled")}
                      <br />
                      Delivered {metricValue(snapshot.analytics?.funnel_json, "delivered")}
                    </td>
                    <td>
                      Best {metricValue(snapshot.analytics?.top_content_json, "best_channel")}
                      <br />
                      Variants {metricValue(snapshot.analytics?.top_content_json, "total_variants")}
                    </td>
                    <td>
                      Sends {metricValue(snapshot.analytics?.trend_json, "sends_last_snapshot")}
                      <br />
                      Engagement {metricValue(snapshot.analytics?.trend_json, "engagement_last_snapshot")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      </div>
    </main>
  );
}
