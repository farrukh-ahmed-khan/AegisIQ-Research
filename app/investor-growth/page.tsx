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
      </div>
    </main>
  );
}
