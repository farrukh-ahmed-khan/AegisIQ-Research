"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./enterprise.module.css";

type TopCampaign = {
  campaign_id: string;
  company_name: string;
  ticker: string;
  engagement_score: number;
  best_channel: string;
};

type PremiumModule = {
  status: string;
  url: string;
};

type EnterprisePayload = {
  generated_at: string;
  ir_analytics_workspace: {
    total_campaigns: number;
    avg_engagement_score: number;
    total_sent: number;
    total_opens: number;
    total_clicks: number;
    total_replies: number;
    best_platform_channel: string;
    top_campaigns: TopCampaign[];
  };
  governance_summary: {
    campaigns_on_hold: number;
    content_locked: number;
    post_approval_invalidated: number;
    sla_overdue: number;
    total_risk_flags: number;
    approval_status: { pending: number; approved: number };
  };
  crm_intelligence: {
    total_contacts: number;
    contacts_by_stage: Record<string, number>;
    scoring_endpoint: string;
    targeting_endpoint: string;
  };
  deal_room: {
    description: string;
    eligible_campaigns: Array<{
      campaign_id: string;
      company_name: string;
      ticker: string;
      status: string;
    }>;
    instructions: string[];
  };
  enterprise_controls: Record<string, boolean>;
  export_urls: {
    board_report_json: string;
    board_report_csv: string;
    approvals_csv: string;
  };
  premium_modules: Record<string, PremiumModule>;
};

const MODULE_LABELS: Record<string, string> = {
  board_reporting: "Board Reporting",
  audit_governance: "Audit Governance",
  investor_crm: "Investor CRM",
  ai_strategy_engine: "AI Strategy Engine",
  multi_channel_execution: "Multi-Channel Execution",
  analytics_attribution: "Analytics & Attribution",
};

const CONTROL_LABELS: Record<string, string> = {
  role_aware_approvals: "Role-Aware Approvals",
  channel_level_publishing_controls: "Channel-Level Publishing Controls",
  content_lock_after_approval: "Content Lock After Approval",
  multi_step_approval_chains: "Multi-Step Approval Chains",
  compliance_hold_states: "Compliance Hold States",
  audit_export: "Audit Export",
};

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function InvestorGrowthEnterprisePage() {
  const [data, setData] = useState<EnterprisePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/investor-growth/enterprise", {
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(payload.error || "Failed to load enterprise workspace.");
        }

        setData((await response.json()) as EnterprisePayload);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load enterprise workspace.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const ir = data?.ir_analytics_workspace;
  const gov = data?.governance_summary;
  const crm = data?.crm_intelligence;
  const dealRoom = data?.deal_room;
  const controls = data?.enterprise_controls ?? {};
  const modules = data?.premium_modules ?? {};
  const exports = data?.export_urls;
  const topCampaigns = ir?.top_campaigns ?? [];
  const contactStages = crm?.contacts_by_stage ?? {};
  const totalContacts = crm?.total_contacts ?? 0;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Enterprise IR Platform</h1>
            <p className={styles.subtitle}>
              Investor relations operations platform — IR analytics workspace, deal room,
              governance controls, CRM intelligence, and premium module access.
            </p>
          </div>
          <div className={styles.actions}>
            <Link href="/investor-growth" className={styles.link}>
              Dashboard
            </Link>
            <Link href="/investor-growth/strategy" className={styles.linkSecondary}>
              AI Strategy
            </Link>
            <Link href="/investor-growth/reports" className={styles.linkSecondary}>
              Board Report
            </Link>
            {exports?.board_report_csv ? (
              <a href={exports.board_report_csv} className={styles.exportButton}>
                Export CSV
              </a>
            ) : null}
          </div>
        </header>

        {data?.generated_at ? (
          <p className={styles.generatedAt}>
            Workspace generated: {formatDate(data.generated_at)}
          </p>
        ) : null}

        {error ? <p className={styles.error}>{error}</p> : null}

        {/* IR Analytics Workspace */}
        <h2 className={styles.sectionTitle}>IR Analytics Workspace</h2>
        <div className={styles.metricsGrid}>
          <article className={styles.metricCard}>
            <span>Total Campaigns</span>
            <strong>{loading ? "--" : (ir?.total_campaigns ?? 0)}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Avg Engagement Score</span>
            <strong>{loading ? "--" : (ir?.avg_engagement_score ?? 0)}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Total Sent</span>
            <strong>{loading ? "--" : (ir?.total_sent ?? 0)}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Opens / Clicks / Replies</span>
            <strong>
              {loading
                ? "--"
                : `${ir?.total_opens ?? 0}/${ir?.total_clicks ?? 0}/${ir?.total_replies ?? 0}`}
            </strong>
          </article>
          <article className={styles.metricCard}>
            <span>Best Platform Channel</span>
            <strong style={{ fontSize: "1.2rem" }}>
              {loading ? "--" : (ir?.best_platform_channel ?? "email")}
            </strong>
          </article>
        </div>

        <div className={styles.panelGrid}>
          {/* Top Campaigns */}
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Top Performing Campaigns</h3>
            {loading ? (
              <p className={styles.empty}>Loading...</p>
            ) : topCampaigns.length === 0 ? (
              <p className={styles.empty}>No campaign engagement data yet.</p>
            ) : (
              topCampaigns.map((campaign) => (
                <div key={campaign.campaign_id} className={styles.topCampaignRow}>
                  <div>
                    <p className={styles.topCampaignName}>
                      {campaign.company_name || campaign.ticker || "Campaign"}
                    </p>
                    <p className={styles.topCampaignMeta}>
                      {campaign.ticker} &bull; Best: {campaign.best_channel}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span className={styles.engagementBadge}>
                      {campaign.engagement_score}
                    </span>
                    <Link
                      href={`/investor-growth/campaigns/${campaign.campaign_id}`}
                      className={styles.linkSecondary}
                      style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                    >
                      Open
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Governance Summary */}
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Governance Summary</h3>
            {loading ? (
              <p className={styles.empty}>Loading...</p>
            ) : (
              <div className={styles.govGrid}>
                <div className={styles.govItem}>
                  <span className={styles.govLabel}>On Hold</span>
                  <span
                    className={`${styles.govValue} ${(gov?.campaigns_on_hold ?? 0) > 0 ? styles.alert : styles.ok}`}
                  >
                    {gov?.campaigns_on_hold ?? 0}
                  </span>
                </div>
                <div className={styles.govItem}>
                  <span className={styles.govLabel}>SLA Overdue</span>
                  <span
                    className={`${styles.govValue} ${(gov?.sla_overdue ?? 0) > 0 ? styles.alert : styles.ok}`}
                  >
                    {gov?.sla_overdue ?? 0}
                  </span>
                </div>
                <div className={styles.govItem}>
                  <span className={styles.govLabel}>Content Locked</span>
                  <span className={styles.govValue}>{gov?.content_locked ?? 0}</span>
                </div>
                <div className={styles.govItem}>
                  <span className={styles.govLabel}>Risk Flags</span>
                  <span
                    className={`${styles.govValue} ${(gov?.total_risk_flags ?? 0) > 0 ? styles.alert : styles.ok}`}
                  >
                    {gov?.total_risk_flags ?? 0}
                  </span>
                </div>
                <div className={styles.govItem}>
                  <span className={styles.govLabel}>Pending Approvals</span>
                  <span className={styles.govValue}>
                    {gov?.approval_status.pending ?? 0}
                  </span>
                </div>
                <div className={styles.govItem}>
                  <span className={styles.govLabel}>Invalidated</span>
                  <span
                    className={`${styles.govValue} ${(gov?.post_approval_invalidated ?? 0) > 0 ? styles.alert : styles.ok}`}
                  >
                    {gov?.post_approval_invalidated ?? 0}
                  </span>
                </div>
              </div>
            )}
            <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
              <Link
                href="/investor-growth/approvals"
                className={styles.linkSecondary}
                style={{ padding: "6px 14px", fontSize: "0.85rem" }}
              >
                View Approvals
              </Link>
              {exports?.approvals_csv ? (
                <a
                  href={exports.approvals_csv}
                  className={styles.exportButton}
                  style={{ padding: "6px 14px", fontSize: "0.85rem" }}
                >
                  Audit Export
                </a>
              ) : null}
            </div>
          </div>

          {/* CRM Intelligence */}
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>
              Investor CRM Intelligence
              {!loading ? (
                <span
                  className={styles.engagementBadge}
                  style={{ marginLeft: "10px", fontWeight: 400 }}
                >
                  {totalContacts} contacts
                </span>
              ) : null}
            </h3>
            {loading ? (
              <p className={styles.empty}>Loading...</p>
            ) : totalContacts === 0 ? (
              <p className={styles.empty}>No contacts yet.</p>
            ) : (
              Object.entries(contactStages).map(([stage, count]) => (
                <div key={stage} className={styles.stageRow}>
                  <span className={styles.stageLabel}>{stage}</span>
                  <div className={styles.stageBar}>
                    <div
                      className={styles.stageBarFill}
                      style={{
                        width: `${Math.min(100, Math.round((count / totalContacts) * 100))}%`,
                      }}
                    />
                  </div>
                  <span className={styles.stageCount}>{count}</span>
                </div>
              ))
            )}
            <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
              <Link
                href="/investor-growth/contacts"
                className={styles.linkSecondary}
                style={{ padding: "6px 14px", fontSize: "0.85rem" }}
              >
                Manage Contacts
              </Link>
              <Link
                href="/investor-growth/contacts/scoring"
                className={styles.linkSecondary}
                style={{ padding: "6px 14px", fontSize: "0.85rem" }}
              >
                Scoring
              </Link>
            </div>
          </div>

          {/* Deal Room */}
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Deal Room</h3>
            {loading ? (
              <p className={styles.empty}>Loading...</p>
            ) : (
              <>
                <p className={styles.dealRoomDesc}>{dealRoom?.description}</p>
                <ul className={styles.dealInstructionList}>
                  {dealRoom?.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ul>
                <p className={styles.govLabel} style={{ marginBottom: "8px" }}>
                  Eligible Campaigns (content-locked)
                </p>
                {dealRoom?.eligible_campaigns.length === 0 ? (
                  <p className={styles.empty}>
                    No content-locked campaigns eligible yet. Lock approved campaigns to
                    make them deal-room ready.
                  </p>
                ) : (
                  <div className={styles.eligibleList}>
                    {dealRoom?.eligible_campaigns.map((campaign) => (
                      <div key={campaign.campaign_id} className={styles.eligibleItem}>
                        <div>
                          <p className={styles.eligibleName}>
                            {campaign.company_name || campaign.ticker || "Campaign"}
                          </p>
                          <p className={styles.eligibleMeta}>
                            {campaign.ticker} &bull; {campaign.status.replace(/_/g, " ")}
                          </p>
                        </div>
                        <Link
                          href={`/investor-growth/campaigns/${campaign.campaign_id}`}
                          className={styles.linkSecondary}
                          style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                        >
                          Open
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Enterprise Controls */}
        <h2 className={styles.sectionTitle}>Enterprise User Controls</h2>
        <div className={styles.panel} style={{ marginBottom: "24px" }}>
          {loading ? (
            <p className={styles.empty}>Loading...</p>
          ) : (
            <ul className={styles.controlList}>
              {Object.entries(controls).map(([key, active]) => (
                <li key={key} className={styles.controlItem}>
                  <span className={styles.checkIcon}>{active ? "✓" : "✗"}</span>
                  <span>{CONTROL_LABELS[key] ?? key.replace(/_/g, " ")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Premium Modules */}
        <h2 className={styles.sectionTitle}>Premium Reporting &amp; Governance Modules</h2>
        <div className={styles.moduleGrid}>
          {loading ? (
            <p className={styles.empty}>Loading modules...</p>
          ) : (
            Object.entries(modules).map(([key, mod]) => (
              <Link key={key} href={mod.url} className={styles.moduleCard}>
                <span className={styles.moduleName}>
                  {MODULE_LABELS[key] ?? key.replace(/_/g, " ")}
                </span>
                <span className={styles.moduleStatus}>{mod.status}</span>
              </Link>
            ))
          )}
        </div>

        {/* Export Actions */}
        <h2 className={styles.sectionTitle}>Data Exports</h2>
        <div className={styles.exportRow}>
          {exports?.board_report_json ? (
            <a href={exports.board_report_json} className={styles.linkSecondary}>
              Board Report (JSON)
            </a>
          ) : null}
          {exports?.board_report_csv ? (
            <a href={exports.board_report_csv} className={styles.exportButton}>
              Board Report (CSV)
            </a>
          ) : null}
          {exports?.approvals_csv ? (
            <a href={exports.approvals_csv} className={styles.exportButton}>
              Approvals Audit (CSV)
            </a>
          ) : null}
        </div>
      </div>
    </main>
  );
}
