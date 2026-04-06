"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { message } from "antd";
import StatusBadge from "../../../../components/investor-growth/status-badge";
import styles from "./page.module.css";

type CampaignDetail = {
  id: string;
  ticker: string;
  company_name: string;
  campaign_objective: string;
  audience_focus: string;
  tone: string;
  notes: string;
  status: "draft" | "pending_approval" | "approved" | "rejected" | "sent";
  approval_status: string;
  email_delivery_status: "not_sent" | "sending" | "sent" | "failed";
  email_sent_at: string | null;
  provider_message_id: string | null;
  last_error: string | null;
  strategy: string;
  email_subject: string;
  email_draft: string;
  sms_draft: string;
  social_post: string;
  segment_id?: string | null;
  created_at: string;
};

type DeliveryEvent = {
  id: string;
  channel: string;
  recipient: string;
  recipient_name: string;
  subject: string;
  body: string;
  status: string;
  provider: string;
  provider_message_id: string | null;
  error: string | null;
  timestamp: string;
};

type EditState = {
  email_subject: string;
  email_body: string;
  sms_body: string;
  social_post: string;
};

type SendState = {
  recipient_name: string;
  recipient_email: string;
};

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-US");
}

function mapEmailDeliveryStatusToBadgeStatus(
  status: string,
):
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "sent"
  | "in_progress" {
  switch (status) {
    case "sent":
      return "sent";
    case "sending":
      return "in_progress";
    case "failed":
      return "rejected";
    case "not_sent":
      return "draft";
    default:
      return "draft";
  }
}

export default function InvestorGrowthCampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params?.id;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [deliveryEvents, setDeliveryEvents] = useState<DeliveryEvent[]>([]);
  const [segments, setSegments] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [editState, setEditState] = useState<EditState>({
    email_subject: "",
    email_body: "",
    sms_body: "",
    social_post: "",
  });
  const [sendState, setSendState] = useState<SendState>({
    recipient_name: "",
    recipient_email: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const [isSubmittingForApproval, setIsSubmittingForApproval] = useState(false);
  const [isApprovingRejecting, setIsApprovingRejecting] = useState(false);

  const loadCampaign = useCallback(async () => {
    if (!campaignId) {
      setError("Campaign not found.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/investor-growth/campaigns/${campaignId}`, {
        method: "GET",
        cache: "no-store",
      });

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
  }, [campaignId]);

  const loadDeliveryHistory = useCallback(async () => {
    if (!campaignId) {
      setIsHistoryLoading(false);
      return;
    }

    setIsHistoryLoading(true);

    try {
      const response = await fetch(
        `/api/investor-growth/campaigns/${campaignId}/delivery-events`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error || "Failed to load delivery history.");
      }

      const data = (await response.json()) as {
        delivery_events?: DeliveryEvent[];
      };
      setDeliveryEvents(
        Array.isArray(data.delivery_events) ? data.delivery_events : [],
      );
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "Failed to load delivery history.",
      );
      setDeliveryEvents([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
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
    void loadDeliveryHistory();
    void loadSegments();
  }, [loadCampaign, loadDeliveryHistory]);

  const approvalGranted = campaign?.approval_status === "approved";
  const canSendEmail =
    Boolean(campaign) &&
    approvalGranted &&
    !isSendingEmail &&
    Boolean(sendState.recipient_email.trim()) &&
    Boolean(editState.email_subject.trim()) &&
    Boolean(editState.email_body.trim());

  async function handleSave() {
    if (!campaignId || !campaign) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/investor-growth/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_subject: editState.email_subject,
          email_body: editState.email_body,
          sms_body: editState.sms_body,
          social_post: editState.social_post,
          segment_id: selectedSegmentId,
        }),
      });

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

      await loadCampaign();
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

      await loadCampaign();
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

      await loadCampaign();
      message.success("Campaign rejected.");
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : "Failed to reject campaign.";
      message.error(messageText);
    } finally {
      setIsApprovingRejecting(false);
    }
  }

  async function handleSendEmail() {
    if (!campaignId || !campaign) {
      return;
    }

    if (!approvalGranted) {
      message.error("Campaign must be approved before sending.");
      return;
    }

    if (!sendState.recipient_email.trim()) {
      message.error("Recipient email is required.");
      return;
    }

    if (!editState.email_subject.trim() || !editState.email_body.trim()) {
      message.error("Subject and email body are required before sending.");
      return;
    }

    setIsSendingEmail(true);

    try {
      const response = await fetch(
        `/api/investor-growth/campaigns/${campaignId}/send-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient_name: sendState.recipient_name,
            recipient_email: sendState.recipient_email,
            subject: editState.email_subject,
            body: editState.email_body,
          }),
        },
      );

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        campaign?: CampaignDetail;
      };

      if (!response.ok) {
        if (payload.campaign) {
          setCampaign(payload.campaign);
        }
        throw new Error(payload.error || "Failed to send email.");
      }

      if (payload.campaign) {
        setCampaign(payload.campaign);
      }

      await loadCampaign();
      await loadDeliveryHistory();
      message.success("Email sent successfully.");
    } catch (err) {
      await loadCampaign();
      await loadDeliveryHistory();
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
          <div className={styles.headerActions}>
            <Link href="/investor-growth" className={styles.backLink}>
              Dashboard
            </Link>
            <Link href="/investor-growth/campaigns" className={styles.backLink}>
              Back to Campaigns
            </Link>
          </div>
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
                  <StatusBadge status={campaign.status} />
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Email Delivery: </span>
                  <StatusBadge
                    status={mapEmailDeliveryStatusToBadgeStatus(
                      campaign.email_delivery_status,
                    )}
                  />
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Created Date: </span>
                  <span className={styles.infoValue}>
                    {formatDate(campaign.created_at)}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Last Sent: </span>
                  <span className={styles.infoValue}>
                    {formatDate(campaign.email_sent_at)}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Provider Message ID: </span>
                  <span className={styles.infoValue}>
                    {campaign.provider_message_id || "-"}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Last Error: </span>
                  <span className={styles.infoValue}>
                    {campaign.last_error || "-"}
                  </span>
                </div>

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

                {campaign.status === "draft" ? (
                  <button
                    className={styles.submitButton}
                    onClick={() => void handleSubmitForApproval()}
                    disabled={isSubmittingForApproval}
                  >
                    {isSubmittingForApproval
                      ? "Submitting..."
                      : "Submit for Approval"}
                  </button>
                ) : null}

                {campaign.status === "pending_approval" ? (
                  <div className={styles.approvalActions}>
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
                ) : null}
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
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </article>

              <article className={styles.card}>
                <h2 className={styles.sectionTitle}>Send Email</h2>
                <p className={styles.helperCopy}>
                  Each click sends exactly one email using the current subject
                  and body shown above.
                </p>

                {!approvalGranted ? (
                  <div className={styles.warningBox}>
                    This campaign is not approved yet. Approve it before sending
                    any email.
                  </div>
                ) : null}

                <div className={styles.block}>
                  <h3 className={styles.blockTitle}>Recipient Name</h3>
                  <input
                    className={styles.input}
                    value={sendState.recipient_name}
                    onChange={(e) =>
                      setSendState((prev) => ({
                        ...prev,
                        recipient_name: e.target.value,
                      }))
                    }
                    placeholder="Investor name"
                  />
                </div>

                <div className={styles.block}>
                  <h3 className={styles.blockTitle}>Recipient Email</h3>
                  <input
                    className={styles.input}
                    type="email"
                    value={sendState.recipient_email}
                    onChange={(e) =>
                      setSendState((prev) => ({
                        ...prev,
                        recipient_email: e.target.value,
                      }))
                    }
                    placeholder="investor@example.com"
                  />
                </div>

                <button
                  type="button"
                  className={styles.sendButton}
                  onClick={() => void handleSendEmail()}
                  disabled={!canSendEmail}
                >
                  {isSendingEmail ? "Sending..." : "Send Email"}
                </button>

                {!approvalGranted ? (
                  <p className={styles.helperText}>
                    Send is disabled until approval status is `approved`.
                  </p>
                ) : null}
              </article>

              <article className={styles.card}>
                <h2 className={styles.sectionTitle}>Delivery History</h2>

                {isHistoryLoading ? (
                  <p className={styles.message}>Loading delivery history...</p>
                ) : null}

                {!isHistoryLoading && deliveryEvents.length === 0 ? (
                  <p className={styles.message}>
                    No delivery attempts have been logged yet.
                  </p>
                ) : null}

                {!isHistoryLoading && deliveryEvents.length > 0 ? (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Channel</th>
                          <th>Recipient</th>
                          <th>Status</th>
                          <th>Provider</th>
                          <th>Timestamp</th>
                          <th>Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveryEvents.map((event) => (
                          <tr key={event.id}>
                            <td>{event.channel}</td>
                            <td>
                              <div className={styles.recipientCell}>
                                <strong>{event.recipient || "-"}</strong>
                                <span>{event.recipient_name || "-"}</span>
                              </div>
                            </td>
                            <td>
                              <StatusBadge
                                status={mapEmailDeliveryStatusToBadgeStatus(
                                  event.status,
                                )}
                              />
                            </td>
                            <td>{event.provider || "-"}</td>
                            <td>{formatDate(event.timestamp)}</td>
                            <td>{event.error || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </article>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
