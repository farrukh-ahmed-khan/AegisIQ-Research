"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./reports.module.css";

type CampaignRow = {
  campaign_id: string;
  ticker: string;
  company_name: string;
  status: string;
  sent: number;
  failed: number;
  opens: number;
  clicks: number;
  replies: number;
  engagement_score: number;
  approval_to_delivery_conversion: number;
  funnel_approvals: number;
  funnel_scheduled: number;
  funnel_delivered: number;
  best_channel: string;
  current_approval_step: number | null;
  total_approval_steps: number;
  sla_overdue: boolean;
  approver_role: string | null;
  sla_due_at: string | null;
  created_at: string;
};

type TopCampaign = {
  campaign_id: string;
  company_name: string;
  ticker: string;
  engagement_score: number;
  best_channel: string;
};

type BoardReport = {
  generated_at: string;
  portfolio_summary: {
    total_campaigns: number;
    draft: number;
    pending_approval: number;
    approved: number;
    sent: number;
    failed_deliveries: number;
  };
  delivery_metrics: {
    total_sent: number;
    total_failed: number;
    total_opens: number;
    total_clicks: number;
    total_replies: number;
    avg_engagement_score: number;
  };
  approval_sla_summary: {
    pending: number;
    overdue_sla: number;
    approved: number;
  };
  audience_engagement_overview: {
    avg_engagement_score: number;
    top_performing_campaigns: TopCampaign[];
  };
  campaign_funnel_summary: Array<{
    campaign_id: string;
    company_name: string;
    ticker: string;
    status: string;
    funnel_approvals: number;
    funnel_scheduled: number;
    funnel_delivered: number;
    approval_to_delivery_conversion: number;
    sla_overdue: boolean;
  }>;
  campaign_rows: CampaignRow[];
  export_urls: { json: string; csv: string };
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function InvestorGrowthReportsPage() {
  const [report, setReport] = useState<BoardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/investor-growth/reports/board", {
          cache: "no-store",
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(payload.error || "Failed to load board report.");
        }
        setReport((await response.json()) as BoardReport);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load board report.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const portfolio = report?.portfolio_summary;
  const delivery = report?.delivery_metrics;
  const sla = report?.approval_sla_summary;
  const topCampaigns = report?.audience_engagement_overview.top_performing_campaigns ?? [];
  const funnelRows = report?.campaign_funnel_summary ?? [];
  const allRows = report?.campaign_rows ?? [];

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Board-Level IR Report</h1>
            <p className={styles.subtitle}>
              Enterprise investor relations summary — campaign portfolio, delivery health,
              approval SLA, and audience engagement overview.
            </p>
          </div>
          <div className={styles.actions}>
            <Link href="/investor-growth" className={styles.link}>
              Dashboard
            </Link>
            <Link href="/investor-growth/analytics" className={styles.linkSecondary}>
              Analytics
            </Link>
            <Link href="/investor-growth/approvals" className={styles.linkSecondary}>
              Approvals
            </Link>
            {report?.export_urls.csv ? (
              <a href={report.export_urls.csv} className={styles.exportButton}>
                Export CSV
              </a>
            ) : null}
          </div>
        </header>

        {report?.generated_at ? (
          <p className={styles.generatedAt}>
            Report generated: {formatDate(report.generated_at)}
          </p>
        ) : null}

        {error ? <p className={styles.error}>{error}</p> : null}

        {/* Portfolio Summary */}
        <h2 className={styles.sectionTitle}>Portfolio Summary</h2>
        <div className={styles.summaryGrid}>
          <article className={styles.metricCard}>
            <span>Total Campaigns</span>
            <strong>{loading ? "--" : portfolio?.total_campaigns ?? 0}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Drafts</span>
            <strong>{loading ? "--" : portfolio?.draft ?? 0}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Pending Approval</span>
            <strong>{loading ? "--" : portfolio?.pending_approval ?? 0}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Approved</span>
            <strong>{loading ? "--" : portfolio?.approved ?? 0}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Sent</span>
            <strong>{loading ? "--" : portfolio?.sent ?? 0}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Failed Deliveries</span>
            <strong>{loading ? "--" : portfolio?.failed_deliveries ?? 0}</strong>
          </article>
        </div>

        {/* Delivery Metrics */}
        <h2 className={styles.sectionTitle}>Delivery &amp; Engagement Metrics</h2>
        <div className={styles.summaryGrid}>
          <article className={styles.metricCard}>
            <span>Total Sent</span>
            <strong>{loading ? "--" : delivery?.total_sent ?? 0}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Opens / Clicks / Replies</span>
            <strong>
              {loading
                ? "--"
                : `${delivery?.total_opens ?? 0}/${delivery?.total_clicks ?? 0}/${delivery?.total_replies ?? 0}`}
            </strong>
          </article>
          <article className={styles.metricCard}>
            <span>Avg Engagement Score</span>
            <strong>{loading ? "--" : delivery?.avg_engagement_score ?? 0}</strong>
          </article>
        </div>

        {/* Approval SLA Summary */}
        <h2 className={styles.sectionTitle}>Approval SLA Summary</h2>
        <div className={styles.summaryGrid}>
          <article className={styles.metricCard}>
            <span>Pending Approval</span>
            <strong>{loading ? "--" : sla?.pending ?? 0}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Overdue SLAs</span>
            <strong>{loading ? "--" : sla?.overdue_sla ?? 0}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Approved / Sent</span>
            <strong>{loading ? "--" : sla?.approved ?? 0}</strong>
          </article>
        </div>

        {/* Top Performing Campaigns */}
        <h2 className={styles.sectionTitle}>Audience Engagement — Top Campaigns</h2>
        {loading ? (
          <p className={styles.empty}>Loading top campaigns...</p>
        ) : topCampaigns.length === 0 ? (
          <p className={styles.empty}>No engagement data yet.</p>
        ) : (
          topCampaigns.map((campaign) => (
            <div key={campaign.campaign_id} className={styles.topCard}>
              <div className={styles.topCardRow}>
                <div>
                  <h3 className={styles.topCardTitle}>
                    {campaign.company_name || campaign.ticker || "Campaign"}
                  </h3>
                  <p className={styles.topCardMeta}>
                    {campaign.ticker} &bull; Best channel: {campaign.best_channel}
                  </p>
                </div>
                <span className={styles.engagementBadge}>
                  Score: {campaign.engagement_score}
                </span>
              </div>
            </div>
          ))
        )}

        {/* Campaign Funnel Summary */}
        <h2 className={styles.sectionTitle}>Campaign Funnel Summary</h2>
        {loading ? (
          <p className={styles.empty}>Loading funnel data...</p>
        ) : funnelRows.length === 0 ? (
          <p className={styles.empty}>No funnel data available yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Approvals</th>
                  <th>Scheduled</th>
                  <th>Delivered</th>
                  <th>Conversion %</th>
                  <th>SLA</th>
                </tr>
              </thead>
              <tbody>
                {funnelRows.map((row) => (
                  <tr key={row.campaign_id}>
                    <td>
                      <Link
                        href={`/investor-growth/campaigns/${row.campaign_id}`}
                        className={styles.linkSecondary}
                        style={{ padding: "4px 10px", fontSize: "0.85rem" }}
                      >
                        {row.company_name || row.ticker || "Campaign"}
                      </Link>
                    </td>
                    <td>{row.status.replace(/_/g, " ")}</td>
                    <td>{row.funnel_approvals}</td>
                    <td>{row.funnel_scheduled}</td>
                    <td>{row.funnel_delivered}</td>
                    <td>{row.approval_to_delivery_conversion}%</td>
                    <td>
                      {row.sla_overdue ? (
                        <span className={styles.overdueBadge}>Overdue</span>
                      ) : (
                        <span className={styles.okBadge}>OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Full Campaign Row Table */}
        <h2 className={styles.sectionTitle}>Full Campaign Report</h2>
        {loading ? (
          <p className={styles.empty}>Loading campaign data...</p>
        ) : allRows.length === 0 ? (
          <p className={styles.empty}>No campaigns found.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Sent</th>
                  <th>Opens</th>
                  <th>Clicks</th>
                  <th>Replies</th>
                  <th>Engagement</th>
                  <th>Best Channel</th>
                  <th>Approval Step</th>
                  <th>SLA Due</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {allRows.map((row) => (
                  <tr key={row.campaign_id}>
                    <td>
                      <Link
                        href={`/investor-growth/campaigns/${row.campaign_id}`}
                        className={styles.linkSecondary}
                        style={{ padding: "4px 10px", fontSize: "0.85rem" }}
                      >
                        {row.company_name || row.ticker || "Campaign"}
                      </Link>
                    </td>
                    <td>{row.status.replace(/_/g, " ")}</td>
                    <td>{row.sent}</td>
                    <td>{row.opens}</td>
                    <td>{row.clicks}</td>
                    <td>{row.replies}</td>
                    <td>{row.engagement_score}</td>
                    <td>{row.best_channel}</td>
                    <td>
                      {row.current_approval_step ?? "-"} /{" "}
                      {row.total_approval_steps}
                    </td>
                    <td>
                      {row.sla_overdue ? (
                        <span className={styles.overdueBadge}>
                          {formatDate(row.sla_due_at)}
                        </span>
                      ) : (
                        formatDate(row.sla_due_at)
                      )}
                    </td>
                    <td>{formatDate(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
