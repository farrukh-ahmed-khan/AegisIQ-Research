"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./scoring.module.css";

type ScoredContact = {
  id: string;
  name: string;
  email: string | null;
  organization: string | null;
  investor_type: string | null;
  account_name: string | null;
  relationship_stage: string;
  interest_score: number;
  last_engagement_at: string | null;
  next_follow_up_at: string | null;
  composite_score: number;
  score_breakdown: {
    interest_score_weighted: number;
    stage_weighted: number;
    recency_weighted: number;
    urgency_weighted: number;
  };
  priority: "high" | "medium" | "low";
  overdue_followup: boolean;
};

type AccountRanking = {
  account: string;
  contact_count: number;
  avg_composite_score: number;
  top_contact: string;
};

type ScoringPayload = {
  contacts: ScoredContact[];
  account_ranking: AccountRanking[];
  summary: {
    total: number;
    high_priority: number;
    medium_priority: number;
    low_priority: number;
    overdue_followups: number;
    avg_composite_score: number;
  };
  scoring_model: {
    description: string;
  };
};

type TargetingResult = {
  campaign_objective: string | null;
  recommended_audience: string;
  contact_count_in_scope: number;
  timing_hint: string;
  top_contacts: ScoredContact[];
  top_segments: Array<{
    segment_id: string;
    segment_name: string;
    description: string | null;
    member_count: number;
    avg_score: number;
    high_priority_count: number;
    recommendation_reason: string;
  }>;
  audience_breakdown: {
    by_stage: Record<string, number>;
    high_priority: number;
    medium_priority: number;
    low_priority: number;
  };
};

function priorityClass(priority: string, styles: Record<string, string>): string {
  if (priority === "high") return styles.priorityHigh;
  if (priority === "medium") return styles.priorityMedium;
  return styles.priorityLow;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function InvestorScoringPage() {
  const [data, setData] = useState<ScoringPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  // Targeting assist
  const [targeting, setTargeting] = useState<TargetingResult | null>(null);
  const [targetingLoading, setTargetingLoading] = useState(false);
  const [targetingError, setTargetingError] = useState("");
  const [targetForm, setTargetForm] = useState({
    campaign_objective: "",
    target_investor_type: "",
    target_relationship_stage: "",
  });

  async function loadScoring(stage?: string, priority?: string) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (stage) params.set("stage", stage);
      if (priority) params.set("priority", priority);
      const res = await fetch(`/api/investor-growth/contacts/scoring?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Failed to load scoring.");
      }
      setData((await res.json()) as ScoringPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scoring.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadScoring();
  }, []);

  async function runTargeting() {
    setTargetingLoading(true);
    setTargetingError("");
    setTargeting(null);
    try {
      const res = await fetch("/api/investor-growth/contacts/targeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetForm),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Failed to run targeting.");
      }
      setTargeting((await res.json()) as TargetingResult);
    } catch (err) {
      setTargetingError(err instanceof Error ? err.message : "Failed to run targeting.");
    } finally {
      setTargetingLoading(false);
    }
  }

  const summary = data?.summary;
  const contacts = data?.contacts ?? [];
  const accounts = data?.account_ranking ?? [];

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Investor Scoring &amp; Prioritization</h1>
            <p className={styles.subtitle}>
              Composite-scored contact rankings, account prioritization, and AI-assisted campaign targeting.
            </p>
          </div>
          <div className={styles.actions}>
            <Link href="/investor-growth/contacts" className={styles.link}>
              Contacts
            </Link>
            <Link href="/investor-growth" className={styles.linkSecondary}>
              Dashboard
            </Link>
          </div>
        </header>

        {error ? <p className={styles.error}>{error}</p> : null}

        {/* Summary cards */}
        <div className={styles.summaryGrid}>
          <article className={styles.metricCard}>
            <span>Total Scored</span>
            <strong>{loading ? "--" : summary?.total ?? 0}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>High Priority</span>
            <strong>{loading ? "--" : summary?.high_priority ?? 0}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Medium Priority</span>
            <strong>{loading ? "--" : summary?.medium_priority ?? 0}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Low Priority</span>
            <strong>{loading ? "--" : summary?.low_priority ?? 0}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Overdue Follow-ups</span>
            <strong>{loading ? "--" : summary?.overdue_followups ?? 0}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Avg Score</span>
            <strong>{loading ? "--" : summary?.avg_composite_score ?? 0}</strong>
          </article>
        </div>

        {data?.scoring_model?.description ? (
          <p className={styles.modelNote}>
            Model: {data.scoring_model.description}
          </p>
        ) : null}

        {/* Filters */}
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Stage</span>
            <select
              className={styles.filterSelect}
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="">All stages</option>
              <option value="relationship">Relationship</option>
              <option value="diligence">Diligence</option>
              <option value="active">Active</option>
              <option value="prospect">Prospect</option>
              <option value="dormant">Dormant</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Priority</span>
            <select
              className={styles.filterSelect}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <button
            className={styles.filterButton}
            onClick={() => void loadScoring(stageFilter, priorityFilter)}
            disabled={loading}
          >
            {loading ? "Loading..." : "Apply Filters"}
          </button>
        </div>

        {/* Ranked contact list */}
        <h2 className={styles.sectionTitle}>Ranked Contact List</h2>
        {loading ? (
          <p className={styles.empty}>Calculating scores...</p>
        ) : contacts.length === 0 ? (
          <p className={styles.empty}>No contacts found. Add contacts first.</p>
        ) : (
          <div className={styles.contactList}>
            {contacts.map((contact, index) => (
              <article key={contact.id} className={styles.contactCard}>
                <div className={styles.contactTop}>
                  <h3 className={styles.contactName}>
                    #{index + 1} {contact.name}
                  </h3>
                  <p className={styles.contactMeta}>
                    {contact.organization || contact.account_name || "No org"} &bull;{" "}
                    {contact.email || "No email"}
                  </p>
                  <p className={styles.contactMeta}>
                    Last engagement: {formatDate(contact.last_engagement_at)} &bull;
                    Next follow-up: {formatDate(contact.next_follow_up_at)}
                  </p>
                  <div className={styles.contactTags}>
                    <span className={styles.tag}>
                      Stage: {contact.relationship_stage}
                    </span>
                    {contact.investor_type ? (
                      <span className={styles.tag}>{contact.investor_type}</span>
                    ) : null}
                    {contact.overdue_followup ? (
                      <span className={styles.tagOverdue}>Overdue follow-up</span>
                    ) : null}
                    <span className={styles.tag}>
                      Interest: {contact.interest_score}
                    </span>
                  </div>
                </div>
                <div className={styles.scoreBlock}>
                  <span className={styles.scoreBadge}>{contact.composite_score}</span>
                  <span
                    className={`${styles.priorityBadge} ${priorityClass(contact.priority, styles)}`}
                  >
                    {contact.priority}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Account ranking */}
        <h2 className={styles.sectionTitle}>Account Ranking</h2>
        {loading ? (
          <p className={styles.empty}>Loading account rankings...</p>
        ) : accounts.length === 0 ? (
          <p className={styles.empty}>No account data. Assign account names to contacts.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Account</th>
                  <th>Contacts</th>
                  <th>Avg Score</th>
                  <th>Top Contact</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account, index) => (
                  <tr key={account.account}>
                    <td>#{index + 1}</td>
                    <td>{account.account}</td>
                    <td>{account.contact_count}</td>
                    <td>
                      <strong>{account.avg_composite_score}</strong>
                    </td>
                    <td>{account.top_contact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Campaign targeting assist */}
        <h2 className={styles.sectionTitle}>Campaign Targeting Assist</h2>
        <div className={styles.targetingPanel}>
          <div className={styles.targetingForm}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Campaign Objective</label>
              <input
                className={styles.formInput}
                value={targetForm.campaign_objective}
                onChange={(e) =>
                  setTargetForm((v) => ({ ...v, campaign_objective: e.target.value }))
                }
                placeholder="e.g. Q2 roadshow follow-up"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Investor Type Filter</label>
              <input
                className={styles.formInput}
                value={targetForm.target_investor_type}
                onChange={(e) =>
                  setTargetForm((v) => ({ ...v, target_investor_type: e.target.value }))
                }
                placeholder="e.g. VC, Angel, PE"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Stage Filter</label>
              <select
                className={styles.formSelect}
                value={targetForm.target_relationship_stage}
                onChange={(e) =>
                  setTargetForm((v) => ({
                    ...v,
                    target_relationship_stage: e.target.value,
                  }))
                }
              >
                <option value="">All stages</option>
                <option value="relationship">Relationship</option>
                <option value="diligence">Diligence</option>
                <option value="active">Active</option>
                <option value="prospect">Prospect</option>
              </select>
            </div>
            <button
              className={styles.runButton}
              onClick={() => void runTargeting()}
              disabled={targetingLoading}
            >
              {targetingLoading ? "Running..." : "Run Targeting"}
            </button>
          </div>

          {targetingError ? <p className={styles.error}>{targetingError}</p> : null}

          {targeting ? (
            <div className={styles.targetingResult}>
              <div className={styles.targetingRow}>
                <div className={styles.infoCard}>
                  <p className={styles.infoLabel}>Recommended Audience</p>
                  <p className={styles.infoValue}>{targeting.recommended_audience}</p>
                </div>
                <div className={styles.infoCard}>
                  <p className={styles.infoLabel}>Contacts In Scope</p>
                  <p className={styles.infoValue}>{targeting.contact_count_in_scope}</p>
                </div>
              </div>
              <div className={styles.infoCard}>
                <p className={styles.infoLabel}>Timing Recommendation</p>
                <p className={styles.infoValue}>{targeting.timing_hint}</p>
              </div>

              <div className={styles.targetingRow}>
                <div>
                  <p className={styles.infoLabel} style={{ marginBottom: 8 }}>
                    Top Recommended Contacts
                  </p>
                  {targeting.top_contacts.slice(0, 5).map((c) => (
                    <div key={c.id} className={styles.segmentItem}>
                      <p className={styles.segmentName}>{c.name}</p>
                      <p className={styles.segmentReason}>
                        {c.organization ?? c.account_name ?? "No org"} &bull; Score:{" "}
                        {c.composite_score} &bull; {c.relationship_stage}
                      </p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className={styles.infoLabel} style={{ marginBottom: 8 }}>
                    Recommended Segments
                  </p>
                  {targeting.top_segments.length === 0 ? (
                    <p className={styles.empty} style={{ padding: 0 }}>
                      No segments found. Create segments first.
                    </p>
                  ) : (
                    targeting.top_segments.map((seg) => (
                      <div key={seg.segment_id} className={styles.segmentItem}>
                        <p className={styles.segmentName}>
                          {seg.segment_name} ({seg.member_count} members, avg{" "}
                          {seg.avg_score})
                        </p>
                        <p className={styles.segmentReason}>
                          {seg.recommendation_reason}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={styles.infoCard}>
                <p className={styles.infoLabel}>Audience Breakdown by Stage</p>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
                  {Object.entries(targeting.audience_breakdown.by_stage).map(
                    ([stage, count]) => (
                      <span key={stage} className={styles.tag}>
                        {stage}: {count}
                      </span>
                    ),
                  )}
                  <span className={styles.tag} style={{ background: "#f0fdf4", color: "#16a34a" }}>
                    High priority: {targeting.audience_breakdown.high_priority}
                  </span>
                  <span className={styles.tag} style={{ background: "#fffbeb", color: "#d97706" }}>
                    Medium: {targeting.audience_breakdown.medium_priority}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {!targeting && !targetingLoading ? (
            <p className={styles.empty}>
              Enter a campaign objective and run targeting to get AI-assisted contact and
              segment recommendations.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
