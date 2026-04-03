"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Input, Modal, message } from "antd";
import styles from "./page.module.css";

type CampaignDetail = {
  id: string;
  ticker: string;
  company_name: string;
  campaign_objective: string;
  audience_focus: string;
  tone: string;
  notes: string;
  status: "draft" | "pending_approval" | "approved" | "rejected" | string;
  email_delivery_status: "not_sent" | "sending" | "sent" | "failed" | string;
  strategy: string;
  email_subject: string;
  email_draft: string;
  sms_draft: string;
  social_post: string;
  segment_id?: string | null;
  created_at: string;
};

type EditState = {
  email_subject: string;
  email_body: string;
  sms_body: string;
  social_post: string;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-US");
}

function getStatusClass(status: string): string {
  switch (status) {
    case "approved":
      return styles.statusApproved;
    case "rejected":
      return styles.statusRejected;
    case "pending_approval":
      return styles.statusPending;
    default:
      return styles.statusDraft;
  }
}

export default function InvestorGrowthCampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params?.id;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [segments, setSegments] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [editState, setEditState] = useState<EditState>({
    email_subject: "",
    email_body: "",
    sms_body: "",
    social_post: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const [isSubmittingForApproval, setIsSubmittingForApproval] = useState(false);
  const [isApprovingRejecting, setIsApprovingRejecting] = useState(false);

  useEffect(() => {
    async function loadCampaign() {
      if (!campaignId) {
        setError("Campaign not found.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/investor-growth/campaigns/${campaignId}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError("Campaign not found.");
            setCampaign(null);
            return;
          }

          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(payload.error || "Failed to load campaign.");
        }

        const data = (await response.json()) as CampaignDetail;
        setCampaign(data);
        setSelectedSegmentId(data.segment_id ?? null);
        setEditState({
          email_subject: data.email_subject || "",
          email_body: data.email_draft || "",
          sms_body: data.sms_draft || "",
          social_post: data.social_post || "",
        });
      } catch (err) {
        const messageText =
          err instanceof Error ? err.message : "Failed to load campaign.";
        setError(messageText);
      } finally {
        setIsLoading(false);
      }
    }

    async function loadSegments() {
      try {
        const response = await fetch(`/api/investor-growth/segments?page=1`);
        const data = await response.json();
        setSegments(data.segments || []);
      } catch (err) {
        console.error("Failed to load segments:", err);
      }
    }

    void loadCampaign();
    void loadSegments();
  }, [campaignId]);

  const canSave = useMemo(
    () => Boolean(campaign && !isSaving),
    [campaign, isSaving],
  );

  async function handleSave() {
    if (!campaignId || !canSave) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/investor-growth/campaigns/${campaignId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email_subject: editState.email_subject,
            email_body: editState.email_body,
            sms_body: editState.sms_body,
            social_post: editState.social_post,
            segment_id: selectedSegmentId,
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error || "Failed to update campaign.");
      }

      const updated = (await response.json()) as CampaignDetail;
      setCampaign(updated);
      setEditState({
        email_subject: updated.email_subject || "",
        email_body: updated.email_draft || "",
        sms_body: updated.sms_draft || "",
        social_post: updated.social_post || "",
      });
      message.success("Campaign updated successfully.");
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : "Failed to update campaign.";
      message.error(messageText);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitForApproval() {
    if (!campaignId || !campaign) {
      return;
    }

    setIsSubmittingForApproval(true);

    try {
      const response = await fetch(
        `/api/investor-growth/campaigns/${campaignId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error || "Failed to submit campaign.");
      }

      const data = (await response.json()) as { status: string };
      setCampaign((prev) => (prev ? { ...prev, status: data.status } : prev));
      message.success("Campaign submitted for approval.");
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : "Failed to submit campaign.";
      message.error(messageText);
    } finally {
      setIsSubmittingForApproval(false);
    }
  }

  async function handleApprove() {
    if (!campaignId || !campaign) {
      return;
    }

    setIsApprovingRejecting(true);

    try {
      const response = await fetch(
        `/api/investor-growth/campaigns/${campaignId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision_notes: "" }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error || "Failed to approve campaign.");
      }

      const data = (await response.json()) as { status: string };
      setCampaign((prev) => (prev ? { ...prev, status: data.status } : prev));
      message.success("Campaign approved.");
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : "Failed to approve campaign.";
      message.error(messageText);
    } finally {
      setIsApprovingRejecting(false);
    }
  }

  async function handleReject() {
    if (!campaignId || !campaign) {
      return;
    }

    Modal.confirm({
      title: "Reject Campaign",
      content: "Are you sure you want to reject this campaign?",
      okText: "Reject",
      okType: "danger",
      onOk: async () => {
        setIsApprovingRejecting(true);

        try {
          const response = await fetch(
            `/api/investor-growth/campaigns/${campaignId}/reject`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ decision_notes: "" }),
            },
          );

          if (!response.ok) {
            const payload = (await response.json().catch(() => ({}))) as {
              error?: string;
            };
            throw new Error(payload.error || "Failed to reject campaign.");
          }

          const data = (await response.json()) as { status: string };
          setCampaign((prev) =>
            prev ? { ...prev, status: data.status } : prev,
          );
          message.success("Campaign rejected.");
        } catch (err) {
          const messageText =
            err instanceof Error ? err.message : "Failed to reject campaign.";
          message.error(messageText);
        } finally {
          setIsApprovingRejecting(false);
        }
      },
    });
  }

  async function handleSendEmail() {
    if (!campaignId || !campaign) {
      return;
    }

    if (campaign.status !== "approved") {
      message.error("Campaign must be approved before sending.");
      return;
    }

    if (!recipientEmail.trim()) {
      message.error("Recipient email is required.");
      return;
    }

    setIsSendingEmail(true);

    try {
      const response = await fetch(
        `/api/investor-growth/campaigns/${campaignId}/send-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipient_email: recipientEmail.trim() }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error || "Failed to send email.");
      }

      const payload = (await response.json().catch(() => ({}))) as {
        email_delivery_status?: string;
      };

      setCampaign((prev) =>
        prev
          ? {
              ...prev,
              email_delivery_status: payload.email_delivery_status ?? "sent",
            }
          : prev,
      );
      setIsSendModalOpen(false);
      message.success("Email sent successfully.");
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : "Failed to send email.";
      message.error(messageText);
    } finally {
      setIsSendingEmail(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Campaign Detail</h1>
          <Link href="/investor-growth/campaigns" className={styles.backLink}>
            Back to Campaigns
          </Link>
        </header>

        {isLoading ? (
          <p className={styles.message}>Loading campaign...</p>
        ) : null}
        {!isLoading && error ? <p className={styles.error}>{error}</p> : null}

        {!isLoading && !error && campaign ? (
          <section className={styles.layout}>
            <aside className={styles.leftColumn}>
              <article className={styles.card}>
                <h2 className={styles.sectionTitle}>Campaign Info</h2>

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Ticker: </span>
                  <span className={styles.infoValue}>
                    {campaign.ticker || "-"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Company Name: </span>
                  <span className={styles.infoValue}>
                    {campaign.company_name || "-"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Objective: </span>
                  <span className={styles.infoValue}>
                    {campaign.campaign_objective || "-"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Audience Focus: </span>
                  <span className={styles.infoValue}>
                    {campaign.audience_focus || "-"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Tone: </span>
                  <span className={styles.infoValue}>
                    {campaign.tone || "-"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Notes: </span>
                  <span className={styles.infoValue}>
                    {campaign.notes || "-"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Status: </span>
                  <span
                    className={`${styles.statusBadge} ${getStatusClass(campaign.status)}`}
                  >
                    {campaign.status}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Email Delivery: </span>
                  <span className={styles.infoValue}>
                    {campaign.email_delivery_status}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Created Date: </span>
                  <span className={styles.infoValue}>
                    {formatDate(campaign.created_at)}
                  </span>
                </div>

                {/* Segment Selection */}
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Segment: </span>
                  <select
                    className={styles.segmentSelect}
                    value={selectedSegmentId ?? ""}
                    onChange={(e) =>
                      setSelectedSegmentId(e.target.value || null)
                    }
                  >
                    <option value="">None</option>
                    {segments.map((seg) => (
                      <option key={seg.id} value={seg.id}>
                        {seg.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Approval Workflow Buttons */}
                {campaign.status === "draft" && (
                  <button
                    className={styles.submitButton}
                    onClick={() => void handleSubmitForApproval()}
                    disabled={isSubmittingForApproval}
                    style={{ marginTop: "10px" }}
                  >
                    {isSubmittingForApproval
                      ? "Submitting..."
                      : "Submit for Approval"}
                  </button>
                )}

                {campaign.status === "pending_approval" && (
                  <div
                    style={{ marginTop: "10px", display: "flex", gap: "10px" }}
                  >
                    <button
                      className={styles.approveButton}
                      onClick={() => void handleApprove()}
                      disabled={isApprovingRejecting}
                    >
                      {isApprovingRejecting ? "Processing..." : "Approve"}
                    </button>
                    <button
                      className={styles.rejectButton}
                      onClick={() => void handleReject()}
                      disabled={isApprovingRejecting}
                    >
                      {isApprovingRejecting ? "Processing..." : "Reject"}
                    </button>
                  </div>
                )}
              </article>
            </aside>

            <div className={styles.rightColumn}>
              <article className={styles.card}>
                <h2 className={styles.sectionTitle}>Generated Content</h2>

                <div className={styles.block}>
                  <h3 className={styles.blockTitle}>Strategy</h3>
                  <p className={styles.body}>{campaign.strategy || "-"}</p>
                </div>

                <div className={styles.block}>
                  <h3 className={styles.blockTitle}>Email Subject</h3>
                  <input
                    className={styles.input}
                    value={editState.email_subject}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        email_subject: e.target.value,
                      }))
                    }
                    placeholder="Add email subject"
                  />
                </div>

                <div className={styles.block}>
                  <h3 className={styles.blockTitle}>Email Draft</h3>
                  <textarea
                    className={styles.textarea}
                    value={editState.email_body}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        email_body: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className={styles.block}>
                  <h3 className={styles.blockTitle}>SMS Draft</h3>
                  <textarea
                    className={styles.textarea}
                    value={editState.sms_body}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        sms_body: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className={styles.block}>
                  <h3 className={styles.blockTitle}>Social Post</h3>
                  <textarea
                    className={styles.textarea}
                    value={editState.social_post}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        social_post: e.target.value,
                      }))
                    }
                  />
                </div>

                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={() => void handleSave()}
                  disabled={!canSave}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  className={styles.sendButton}
                  onClick={() => setIsSendModalOpen(true)}
                  disabled={isSendingEmail || campaign.status !== "approved"}
                  style={{
                    marginLeft: "10px",
                  }}
                >
                  {isSendingEmail ? "Sending..." : "Send Email"}
                </button>

                {campaign.status !== "approved" ? (
                  <p className={styles.helperText}>
                    Campaign must be approved before sending.
                  </p>
                ) : null}
              </article>
            </div>
          </section>
        ) : null}
      </div>

      <Modal
        title="Send Campaign Email"
        open={isSendModalOpen}
        onOk={() => void handleSendEmail()}
        onCancel={() => setIsSendModalOpen(false)}
        okText={isSendingEmail ? "Sending..." : "Confirm Send"}
        confirmLoading={isSendingEmail}
      >
        <p>Are you sure you want to send this campaign email?</p>
        <Input
          value={recipientEmail}
          onChange={(event) => setRecipientEmail(event.target.value)}
          placeholder="recipient@example.com"
        />
      </Modal>
    </main>
  );
}
