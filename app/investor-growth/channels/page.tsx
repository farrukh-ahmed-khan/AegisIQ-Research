"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./channels.module.css";

type Execution = {
  id: string;
  channel: string;
  platform: string | null;
  template_name: string | null;
  scheduled_for: string | null;
  approval_status: string;
  delivery_status: string;
};

type CampaignRow = {
  campaign_id: string;
  company_name: string;
  ticker: string;
  objective: string;
  status: string;
  compliance_state: string;
  channel_mix: Record<string, unknown>;
  approval_rules: Record<string, unknown>;
  executions: Execution[];
  analytics?: {
    metrics_json?: Record<string, unknown>;
  };
};

type Payload = {
  summary: {
    campaigns: number;
    active_channels: number;
    scheduled_posts: number;
  };
  campaigns: CampaignRow[];
};

export default function InvestorGrowthChannelsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/investor-growth/channels", {
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(payload.error || "Failed to load channels dashboard.");
        }

        setData((await response.json()) as Payload);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load channels dashboard.",
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
            <h1 className={styles.title}>Multi-Channel Execution</h1>
            <p className={styles.subtitle}>
              Coordinate email, SMS, and social promotion in one investor-growth workspace.
            </p>
          </div>
          <div className={styles.actions}>
            <Link href="/investor-growth" className={styles.link}>
              Dashboard
            </Link>
            <Link href="/investor-growth/calendar" className={styles.linkSecondary}>
              Calendar
            </Link>
          </div>
        </header>

        {error ? <p className={styles.error}>{error}</p> : null}

        <section className={styles.summaryGrid}>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Campaigns</span>
            <strong className={styles.metricValue}>
              {loading ? "--" : data?.summary.campaigns ?? 0}
            </strong>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Channel Touches</span>
            <strong className={styles.metricValue}>
              {loading ? "--" : data?.summary.active_channels ?? 0}
            </strong>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricLabel}>Scheduled Posts</span>
            <strong className={styles.metricValue}>
              {loading ? "--" : data?.summary.scheduled_posts ?? 0}
            </strong>
          </article>
        </section>

        <section className={styles.listSection}>
          {loading ? <p className={styles.empty}>Loading execution dashboard...</p> : null}

          {!loading && data?.campaigns.length === 0 ? (
            <p className={styles.empty}>
              No multi-channel campaigns are configured yet.
            </p>
          ) : null}

          {!loading && data?.campaigns.length ? (
            <div className={styles.campaignGrid}>
              {data.campaigns.map((campaign) => (
                <article key={campaign.campaign_id} className={styles.campaignCard}>
                  <div className={styles.cardTop}>
                    <div>
                      <h2 className={styles.cardTitle}>
                        {campaign.company_name || campaign.ticker || "Campaign"}
                      </h2>
                      <p className={styles.cardMeta}>
                        {campaign.ticker || "No ticker"} | {campaign.status} |{" "}
                        {campaign.compliance_state}
                      </p>
                    </div>
                    <Link
                      href={`/investor-growth/campaigns/${campaign.campaign_id}`}
                      className={styles.inlineLink}
                    >
                      Open
                    </Link>
                  </div>

                  <p className={styles.objective}>{campaign.objective || "No objective provided."}</p>

                  <div className={styles.tags}>
                    {Object.entries(campaign.channel_mix || {}).length === 0 ? (
                      <span className={styles.tag}>Default mix</span>
                    ) : (
                      Object.entries(campaign.channel_mix || {}).map(([key, value]) => (
                        <span key={key} className={styles.tag}>
                          {key}:{String(value)}
                        </span>
                      ))
                    )}
                  </div>

                  <div className={styles.execList}>
                    {campaign.executions.length === 0 ? (
                      <p className={styles.execEmpty}>
                        No SMS or social executions saved yet.
                      </p>
                    ) : (
                      campaign.executions.map((execution) => (
                        <div key={execution.id} className={styles.execItem}>
                          <strong>
                            {execution.channel}
                            {execution.platform ? ` / ${execution.platform}` : ""}
                          </strong>
                          <span>
                            {execution.delivery_status} | {execution.approval_status}
                          </span>
                          <span>{execution.scheduled_for || "Not scheduled"}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className={styles.analyticsRow}>
                    <span>
                      Engagement:{" "}
                      {String(campaign.analytics?.metrics_json?.engagement_score ?? 0)}
                    </span>
                    <span>
                      Conversion:{" "}
                      {String(
                        campaign.analytics?.metrics_json
                          ?.approval_to_delivery_conversion ?? 0,
                      )}
                      %
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
