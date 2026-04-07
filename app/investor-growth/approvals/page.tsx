"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { message } from "antd";
import MetricCard from "../../../components/investor-growth/metric-card";
import Panel from "../../../components/investor-growth/panel";
import SectionHeader from "../../../components/investor-growth/section-header";
import StatusBadge from "../../../components/investor-growth/status-badge";
import styles from "./approvals.module.css";

type ApprovalCampaign = {
  id: string;
  ticker: string;
  company_name: string;
  campaign_objective: string;
  status: "draft" | "pending_approval" | "approved" | "rejected" | "sent";
  segment_id: string | null;
  created_at: string;
  approval: {
    id: string;
    status: "pending" | "approved" | "rejected";
    submitted_at: string | null;
    decided_at: string | null;
    decision_notes: string | null;
  } | null;
};

type ApprovalHistoryItem = {
  id: string;
  action: string;
  label: string;
  note: string | null;
  acted_by: string;
  created_at: string;
};

type ApprovalDashboardResponse = {
  summary: {
    pending: number;
    ready_to_submit: number;
    approved: number;
  };
  campaigns: ApprovalCampaign[];
  pending_campaigns: ApprovalCampaign[];
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US");
}

export default function InvestorGrowthApprovalsPage() {
  const router = useRouter();
  const [data, setData] = useState<ApprovalDashboardResponse | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryItem[]>(
    [],
  );
  const [decisionNotes, setDecisionNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState("");

  async function loadApprovals(preferredCampaignId?: string | null) {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/investor-growth/approvals", {
        cache: "no-store",
      });

      if (response.status === 401) {
        setError("Please sign in to access the approval queue.");
        router.replace("/sign-in");
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error || "Failed to load approvals.");
      }

      const payload = (await response.json()) as ApprovalDashboardResponse;
      setData(payload);

      const nextId =
        preferredCampaignId &&
        payload.campaigns.some((campaign) => campaign.id === preferredCampaignId)
          ? preferredCampaignId
          : payload.pending_campaigns[0]?.id ?? payload.campaigns[0]?.id ?? null;
      setSelectedCampaignId(nextId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approvals.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadApprovalHistory(campaignId: string | null) {
    if (!campaignId) {
      setApprovalHistory([]);
      return;
    }

    setIsHistoryLoading(true);

    try {
      const response = await fetch(
        `/api/investor-growth/campaigns/${campaignId}/approval-history`,
        {
          cache: "no-store",
        },
      );

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error || "Failed to load approval history.");
      }

      const payload = (await response.json()) as {
        history?: ApprovalHistoryItem[];
      };
      setApprovalHistory(Array.isArray(payload.history) ? payload.history : []);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "Failed to load approval history.",
      );
      setApprovalHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }

  useEffect(() => {
    void loadApprovals();
  }, []);

  useEffect(() => {
    void loadApprovalHistory(selectedCampaignId);
  }, [selectedCampaignId]);

  const campaigns = data?.campaigns ?? [];
  const selectedCampaign = useMemo(
    () =>
      campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId],
  );

  async function handleAction(action: "submit" | "approve" | "reject") {
    if (!selectedCampaign) return;

    setIsActing(true);

    try {
      const endpoint =
        action === "submit"
          ? "submit"
          : action === "approve"
            ? "approve"
            : "reject";

      const response = await fetch(
        `/api/investor-growth/campaigns/${selectedCampaign.id}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body:
            action === "submit"
              ? JSON.stringify({})
              : JSON.stringify({ decision_notes: decisionNotes }),
        },
      );

      if (response.status === 401) {
        message.error("Your session has expired. Please sign in again.");
        router.replace("/sign-in");
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error || `Failed to ${action} campaign.`);
      }

      message.success(
        action === "submit"
          ? "Campaign submitted for approval."
          : action === "approve"
            ? "Campaign approved."
            : "Campaign rejected.",
      );
      setDecisionNotes("");
      await loadApprovals(selectedCampaign.id);
      await loadApprovalHistory(selectedCampaign.id);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : `Failed to ${action} campaign.`,
      );
    } finally {
      setIsActing(false);
    }
  }

  const canSubmit =
    selectedCampaign?.status === "draft" || selectedCampaign?.status === "rejected";
  const canApproveReject = selectedCampaign?.status === "pending_approval";

  return (
    <div className={styles.container}>
      <SectionHeader
        title="Approval Queue"
        subtitle="Review campaigns, move drafts into approval, and record decisions."
        action={
          <div className={styles.headerActions}>
            <Link href="/investor-growth" className={styles.backLink}>
              Dashboard
            </Link>
            <Link href="/investor-growth/campaigns" className={styles.backLink}>
              Campaigns
            </Link>
          </div>
        }
      />

      <div className={styles.metricsRow}>
        <MetricCard label="Pending" value={isLoading ? "--" : data?.summary.pending ?? 0} />
        <MetricCard
          label="Ready To Submit"
          value={isLoading ? "--" : data?.summary.ready_to_submit ?? 0}
        />
        <MetricCard
          label="Approved"
          value={isLoading ? "--" : data?.summary.approved ?? 0}
        />
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.layout}>
        <Panel title="Approval Queue">
          {isLoading ? (
            <p className={styles.message}>Loading approvals...</p>
          ) : campaigns.length === 0 ? (
            <p className={styles.message}>No campaigns available yet.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className={
                        selectedCampaignId === campaign.id ? styles.selectedRow : ""
                      }
                      onClick={() => setSelectedCampaignId(campaign.id)}
                    >
                      <td>
                        <div className={styles.campaignCell}>
                          <strong>
                            {campaign.company_name || campaign.ticker || "Campaign"}
                          </strong>
                          <span>{campaign.campaign_objective || "-"}</span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td>{formatDate(campaign.approval?.submitted_at ?? null)}</td>
                      <td>{campaign.approval?.decision_notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className={styles.sideColumn}>
          <Panel title="Action Bar">
            {!selectedCampaign ? (
              <p className={styles.message}>Select a campaign to manage approval.</p>
            ) : (
              <div className={styles.actionPanel}>
                <p className={styles.selectedTitle}>
                  {selectedCampaign.company_name || selectedCampaign.ticker || "Campaign"}
                </p>
                <p className={styles.selectedMeta}>
                  Status: {selectedCampaign.status.replace("_", " ")}
                </p>
                <textarea
                  className={styles.notesInput}
                  value={decisionNotes}
                  onChange={(event) => setDecisionNotes(event.target.value)}
                  placeholder="Optional decision note"
                />
                <div className={styles.buttonRow}>
                  <button
                    className={styles.submitButton}
                    onClick={() => void handleAction("submit")}
                    disabled={!canSubmit || isActing}
                  >
                    {isActing && canSubmit ? "Working..." : "Submit"}
                  </button>
                  <button
                    className={styles.approveButton}
                    onClick={() => void handleAction("approve")}
                    disabled={!canApproveReject || isActing}
                  >
                    {isActing && canApproveReject ? "Working..." : "Approve"}
                  </button>
                  <button
                    className={styles.rejectButton}
                    onClick={() => void handleAction("reject")}
                    disabled={!canApproveReject || isActing}
                  >
                    {isActing && canApproveReject ? "Working..." : "Reject"}
                  </button>
                </div>
                <Link
                  href={
                    selectedCampaign
                      ? `/investor-growth/campaigns/${selectedCampaign.id}`
                      : "/investor-growth/campaigns"
                  }
                  className={styles.detailLink}
                >
                  Open Campaign Detail
                </Link>
              </div>
            )}
          </Panel>

          <Panel title="History Panel">
            {!selectedCampaign ? (
              <p className={styles.message}>Select a campaign to view history.</p>
            ) : isHistoryLoading ? (
              <p className={styles.message}>Loading history...</p>
            ) : approvalHistory.length === 0 ? (
              <p className={styles.message}>No approval history recorded yet.</p>
            ) : (
              <div className={styles.historyList}>
                {approvalHistory.map((item) => (
                  <div key={item.id} className={styles.historyItem}>
                    <div className={styles.historyTop}>
                      <strong>{item.label}</strong>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                    <p>Actor: {item.acted_by}</p>
                    <p>Note: {item.note || "-"}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
