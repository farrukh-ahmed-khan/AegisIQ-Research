"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MetricCard from "../../components/investor-growth/metric-card";
import Panel from "../../components/investor-growth/panel";
import StatusBadge from "../../components/investor-growth/status-badge";
import styles from "./dashboard.module.css";

type DashboardData = {
  summary: {
    total_campaigns: number;
    drafts: number;
    pending_approvals: number;
    approved: number;
    sent: number;
    failed_deliveries: number;
    scheduled_channel_touches: number;
    engagement_score: number;
    opens: number;
    clicks: number;
    replies: number;
  };
  recent_campaigns: Array<{
    id: string;
    ticker: string;
    company_name: string;
    campaign_objective: string;
    status: "draft" | "pending_approval" | "approved" | "rejected" | "sent";
    email_delivery_status: "not_sent" | "sending" | "sent" | "failed";
    created_at: string;
  }>;
  top_content_panels?: Array<{
    campaign_id: string;
    best_channel?: string;
    total_variants?: number;
  }>;
  trend_views?: Array<{
    campaign_id: string;
    generated_at?: string;
    sends_last_snapshot?: number;
    engagement_last_snapshot?: number;
  }>;
};

export default function InvestorGrowthPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch("/api/investor-growth/dashboard", {
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(payload.error || "Failed to load dashboard.");
        }

        setDashboard((await response.json()) as DashboardData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  const summary = dashboard?.summary;
  const recentCampaigns = dashboard?.recent_campaigns ?? [];

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Investor Growth Dashboard</h1>
          <p className={styles.subtitle}>
            Monitor campaign approvals, delivery health, and recent operator
            activity in one place.
          </p>
          <div className={styles.actions}>
            <Link href="/investor-growth/generate" className={styles.actionLink}>
              Create Campaign
            </Link>
            <Link
              href="/investor-growth/campaigns"
              className={styles.actionLinkSecondary}
            >
              View All Campaigns
            </Link>
            <Link
              href="/investor-growth/channels"
              className={styles.actionLinkSecondary}
            >
              Channels
            </Link>
            <Link
              href="/investor-growth/calendar"
              className={styles.actionLinkSecondary}
            >
              Calendar
            </Link>
            <Link
              href="/investor-growth/analytics"
              className={styles.actionLinkSecondary}
            >
              Analytics
            </Link>
            <Link
              href="/investor-growth/approvals"
              className={styles.actionLinkSecondary}
            >
              Approvals
            </Link>
            <Link
              href="/investor-growth/contacts"
              className={styles.actionLinkSecondary}
            >
              Investor CRM
            </Link>
            <Link
              href="/investor-growth/contacts/scoring"
              className={styles.actionLinkSecondary}
            >
              Scoring
            </Link>
            <Link
              href="/investor-growth/segments"
              className={styles.actionLinkSecondary}
            >
              Segments
            </Link>
            <Link
              href="/investor-growth/history"
              className={styles.actionLinkSecondary}
            >
              History
            </Link>
            <Link
              href="/investor-growth/reports"
              className={styles.actionLinkSecondary}
            >
              Board Report
            </Link>
          </div>
        </header>

        {error ? <p className={styles.error}>{error}</p> : null}

        <section className={styles.metrics}>
          <MetricCard
            label="Total Campaigns"
            value={isLoading ? "--" : summary?.total_campaigns ?? 0}
          />
          <MetricCard
            label="Drafts"
            value={isLoading ? "--" : summary?.drafts ?? 0}
          />
          <MetricCard
            label="Pending Approvals"
            value={isLoading ? "--" : summary?.pending_approvals ?? 0}
          />
          <MetricCard
            label="Approved"
            value={isLoading ? "--" : summary?.approved ?? 0}
          />
          <MetricCard
            label="Sent"
            value={isLoading ? "--" : summary?.sent ?? 0}
          />
          <MetricCard
            label="Failed Deliveries"
            value={isLoading ? "--" : summary?.failed_deliveries ?? 0}
          />
          <MetricCard
            label="Scheduled Touches"
            value={isLoading ? "--" : summary?.scheduled_channel_touches ?? 0}
          />
          <MetricCard
            label="Engagement Score"
            value={isLoading ? "--" : summary?.engagement_score ?? 0}
          />
          <MetricCard
            label="Opens / Clicks / Replies"
            value={
              isLoading
                ? "--"
                : `${summary?.opens ?? 0}/${summary?.clicks ?? 0}/${summary?.replies ?? 0}`
            }
          />
        </section>

        <Panel
          title="Recent Campaigns"
          subtitle="The five most recent campaigns across your investor outreach workflow."
        >
          {isLoading ? (
            <p className={styles.emptyState}>Loading dashboard...</p>
          ) : null}

          {!isLoading && recentCampaigns.length === 0 ? (
            <div className={styles.emptyWrap}>
              <p className={styles.emptyState}>
                No campaigns yet. Start by generating your first investor
                campaign.
              </p>
              <Link
                href="/investor-growth/generate"
                className={styles.inlineAction}
              >
                Open Campaign Generator
              </Link>
            </div>
          ) : null}

          {!isLoading && recentCampaigns.length > 0 ? (
            <div className={styles.recentList}>
              {recentCampaigns.map((campaign) => (
                <article key={campaign.id} className={styles.recentCard}>
                  <div className={styles.recentTopRow}>
                    <div>
                      <h3 className={styles.recentTitle}>
                        {campaign.company_name || campaign.ticker || "Campaign"}
                      </h3>
                      <p className={styles.recentMeta}>
                        {campaign.ticker || "No ticker"} •{" "}
                        {new Date(campaign.created_at).toLocaleString("en-US")}
                      </p>
                    </div>
                    <StatusBadge status={campaign.status} />
                  </div>
                  <p className={styles.recentObjective}>
                    {campaign.campaign_objective || "No campaign objective"}
                  </p>
                  <div className={styles.recentFooter}>
                    <span className={styles.deliveryText}>
                      Delivery: {campaign.email_delivery_status.replace("_", " ")}
                    </span>
                    <Link
                      href={`/investor-growth/campaigns/${campaign.id}`}
                      className={styles.inlineAction}
                    >
                      Open Detail
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </Panel>

        <section className={styles.metrics}>
          <Panel
            title="Top Content Panels"
            subtitle="Quick read on which campaigns are producing the strongest content mix."
          >
            {isLoading ? <p className={styles.emptyState}>Loading analytics...</p> : null}
            {!isLoading && (dashboard?.top_content_panels?.length ?? 0) === 0 ? (
              <p className={styles.emptyState}>No analytics snapshots yet.</p>
            ) : null}
            {!isLoading && (dashboard?.top_content_panels?.length ?? 0) > 0 ? (
              <div className={styles.recentList}>
                {dashboard?.top_content_panels?.map((panel) => (
                  <article key={panel.campaign_id} className={styles.recentCard}>
                    <h3 className={styles.recentTitle}>{panel.best_channel || "email"}</h3>
                    <p className={styles.recentMeta}>Campaign ID: {panel.campaign_id}</p>
                    <p className={styles.recentObjective}>
                      Variants: {panel.total_variants ?? 0}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}
          </Panel>

          <Panel
            title="Trend Views"
            subtitle="Simple campaign cohort trend snapshots for optimization loops."
          >
            {isLoading ? <p className={styles.emptyState}>Loading trends...</p> : null}
            {!isLoading && (dashboard?.trend_views?.length ?? 0) === 0 ? (
              <p className={styles.emptyState}>Trend data will appear after execution activity.</p>
            ) : null}
            {!isLoading && (dashboard?.trend_views?.length ?? 0) > 0 ? (
              <div className={styles.recentList}>
                {dashboard?.trend_views?.map((trend) => (
                  <article key={trend.campaign_id} className={styles.recentCard}>
                    <h3 className={styles.recentTitle}>{trend.engagement_last_snapshot ?? 0}</h3>
                    <p className={styles.recentMeta}>Campaign ID: {trend.campaign_id}</p>
                    <p className={styles.recentObjective}>
                      Sends: {trend.sends_last_snapshot ?? 0}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}
          </Panel>
        </section>

        <section className={styles.metrics}>
          <Panel
            title="Governance Workspace"
            subtitle="Operate approval chains, compliance controls, and exportable audit trails."
          >
            <div className={styles.recentList}>
              <article className={styles.recentCard}>
                <h3 className={styles.recentTitle}>Role-Aware Approvals</h3>
                <p className={styles.recentObjective}>
                  Channel-level approval rules, SLA due dates, post-approval invalidation, and CSV exports are available from the approvals queue.
                </p>
                <Link href="/investor-growth/approvals" className={styles.inlineAction}>
                  Open Governance Queue
                </Link>
              </article>
            </div>
          </Panel>

          <Panel
            title="Enterprise IR Platform"
            subtitle="Investor growth now includes CRM workflow, analytics workspace, and board/export-ready operating surfaces."
          >
            <div className={styles.recentList}>
              <article className={styles.recentCard}>
                <h3 className={styles.recentTitle}>CRM + Analytics</h3>
                <p className={styles.recentObjective}>
                  Manage relationship stages, follow-up tasks, outreach timelines, engagement scorecards, and campaign optimization from one workspace.
                </p>
                <Link href="/investor-growth/contacts" className={styles.inlineAction}>
                  Open Investor CRM
                </Link>
              </article>
              <article className={styles.recentCard}>
                <h3 className={styles.recentTitle}>Board-Level IR Report</h3>
                <p className={styles.recentObjective}>
                  Export a full campaign portfolio summary, approval SLA view, delivery metrics, and audience engagement overview for board or institutional reporting.
                </p>
                <Link href="/investor-growth/reports" className={styles.inlineAction}>
                  Open Board Report
                </Link>
              </article>
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}
