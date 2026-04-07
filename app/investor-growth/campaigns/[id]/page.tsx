"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { message } from "antd";
import StatusBadge from "../../../../components/investor-growth/status-badge";
import styles from "./page.module.css";

type Campaign = {
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
  strategy: string;
  email_subject: string;
  email_draft: string;
  sms_draft: string;
  social_post: string;
  segment_id?: string | null;
  channel_mix?: Record<string, unknown>;
  approval_rules?: Record<string, unknown>;
  ai_strategy?: Record<string, unknown>;
  compliance_state?: string;
  compliance_hold_reason?: string | null;
  content_locked_at?: string | null;
  post_approval_edit_invalidated?: boolean;
  approval_chain?: Array<{
    id: string;
    status: string;
    step_number?: number;
    channel?: string | null;
    approver_role?: string | null;
    sla_due_at?: string | null;
    invalidated_at?: string | null;
  }>;
  channel_executions?: Array<{
    id: string;
    channel: string;
    platform: string | null;
    template_name: string | null;
    scheduled_for: string | null;
    approval_status: string;
    delivery_status: string;
  }>;
  analytics?: {
    metrics_json?: Record<string, unknown>;
    segment_metrics_json?: Record<string, unknown>;
    cohort_metrics_json?: Record<string, unknown>;
    top_content_json?: Record<string, unknown>;
    funnel_json?: Record<string, unknown>;
    trend_json?: Record<string, unknown>;
  };
  created_at: string;
};

type DeliveryEvent = {
  id: string;
  channel: string;
  recipient: string;
  recipient_name: string;
  status: string;
  provider: string;
  error: string | null;
  timestamp: string;
};

type ApprovalHistoryItem = {
  id: string;
  label: string;
  note: string | null;
  acted_by: string;
  created_at: string;
};

type SmsTemplate = { id: string; name: string };

type Config = {
  email_enabled: boolean;
  sms_enabled: boolean;
  social_enabled: boolean;
  email_role: string;
  email_steps: string;
  email_sla_hours: string;
  sms_role: string;
  sms_steps: string;
  sms_sla_hours: string;
  social_role: string;
  social_steps: string;
  social_sla_hours: string;
  compliance_state: string;
  compliance_hold_reason: string;
};

const DEFAULT_CONFIG: Config = {
  email_enabled: true, sms_enabled: true, social_enabled: true,
  email_role: "compliance", email_steps: "1", email_sla_hours: "6",
  sms_role: "compliance", sms_steps: "2", sms_sla_hours: "12",
  social_role: "communications", social_steps: "1", social_sla_hours: "24",
  compliance_state: "clear", compliance_hold_reason: "",
};

const fmt = (v: string | null) => !v ? "-" : (Number.isNaN(new Date(v).getTime()) ? v : new Date(v).toLocaleString("en-US"));
const num = (v: unknown) => String(v ?? 0);
const toN = (v: string) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };
const listText = (value: unknown) => Array.isArray(value) ? value.map((item) => String(item)).join(", ") : String(value ?? "-");
const rule = (rules: Record<string, unknown> | undefined, key: string) => ((rules?.[key] && typeof rules[key] === "object") ? rules[key] as Record<string, unknown> : {});
const enabled = (v: unknown, fallback: boolean) => typeof v === "boolean" ? v : typeof v === "string" ? v !== "false" && v !== "off" : fallback;
function badge(status: string) { return status === "sending" ? "in_progress" : status === "failed" ? "rejected" : status === "sent" ? "sent" : "draft"; }

function buildConfig(c: Campaign): Config {
  const e = rule(c.approval_rules, "email");
  const s = rule(c.approval_rules, "sms");
  const o = rule(c.approval_rules, "social");
  return {
    email_enabled: enabled(c.channel_mix?.email, true),
    sms_enabled: enabled(c.channel_mix?.sms, true),
    social_enabled: enabled(c.channel_mix?.social, true),
    email_role: String(e.required_role ?? DEFAULT_CONFIG.email_role),
    email_steps: String(e.steps ?? DEFAULT_CONFIG.email_steps),
    email_sla_hours: String(e.sla_hours ?? DEFAULT_CONFIG.email_sla_hours),
    sms_role: String(s.required_role ?? DEFAULT_CONFIG.sms_role),
    sms_steps: String(s.steps ?? DEFAULT_CONFIG.sms_steps),
    sms_sla_hours: String(s.sla_hours ?? DEFAULT_CONFIG.sms_sla_hours),
    social_role: String(o.required_role ?? DEFAULT_CONFIG.social_role),
    social_steps: String(o.steps ?? DEFAULT_CONFIG.social_steps),
    social_sla_hours: String(o.sla_hours ?? DEFAULT_CONFIG.social_sla_hours),
    compliance_state: c.compliance_state ?? DEFAULT_CONFIG.compliance_state,
    compliance_hold_reason: c.compliance_hold_reason ?? "",
  };
}

export default function InvestorGrowthCampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params?.id;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [deliveryEvents, setDeliveryEvents] = useState<DeliveryEvent[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryItem[]>([]);
  const [segments, setSegments] = useState<Array<{ id: string; name: string }>>([]);
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ email_subject: "", email_body: "", sms_body: "", social_post: "" });
  const [emailSend, setEmailSend] = useState({ recipient_name: "", recipient_email: "" });
  const [sms, setSms] = useState({ recipient_name: "", recipient_phone: "", scheduled_for: "", template_name: "investor_sms" });
  const [social, setSocial] = useState({ platform: "linkedin", template_name: "linkedin_default", scheduled_for: "" });
  const [metrics, setMetrics] = useState({ channel: "email", platform: "resend", opens: "0", clicks: "0", replies: "0" });
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const loadCampaign = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/investor-growth/campaigns/${campaignId}`, { cache: "no-store" });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error || "Failed to load campaign.");
      const data = await res.json() as Campaign;
      setCampaign(data);
      setSelectedSegmentId(data.segment_id ?? null);
      setEdit({ email_subject: data.email_subject || "", email_body: data.email_draft || "", sms_body: data.sms_draft || "", social_post: data.social_post || "" });
      setConfig(buildConfig(data));
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to load campaign."); } finally { setLoading(false); }
  }, [campaignId]);

  const loadExtras = useCallback(async () => {
    if (!campaignId) return;
    const [deliveryRes, approvalRes, segmentRes, templateRes] = await Promise.all([
      fetch(`/api/investor-growth/campaigns/${campaignId}/delivery-events`, { cache: "no-store" }),
      fetch(`/api/investor-growth/campaigns/${campaignId}/approval-history`, { cache: "no-store" }),
      fetch("/api/investor-growth/segments?page=1", { cache: "no-store" }),
      fetch("/api/investor-growth/sms/templates", { cache: "no-store" }),
    ]);
    const delivery = await deliveryRes.json().catch(() => ({})) as { delivery_events?: DeliveryEvent[] };
    const approval = await approvalRes.json().catch(() => ({})) as { history?: ApprovalHistoryItem[] };
    const segment = await segmentRes.json().catch(() => ({})) as { segments?: Array<{ id: string; name: string }> };
    const templates = await templateRes.json().catch(() => ({})) as { templates?: SmsTemplate[] };
    setDeliveryEvents(Array.isArray(delivery.delivery_events) ? delivery.delivery_events : []);
    setApprovalHistory(Array.isArray(approval.history) ? approval.history : []);
    setSegments(Array.isArray(segment.segments) ? segment.segments : []);
    setSmsTemplates(Array.isArray(templates.templates) ? templates.templates : []);
  }, [campaignId]);

  useEffect(() => { void loadCampaign(); void loadExtras(); }, [loadCampaign, loadExtras]);
  const refresh = async () => { await Promise.all([loadCampaign(), loadExtras()]); };
  const approvalGranted = campaign?.approval_status === "approved";

  async function post(url: string, body: Record<string, unknown>, success: string, tag: string) {
    setBusy(tag);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(payload.error || "Request failed.");
      await refresh();
      message.success(success);
    } catch (err) { message.error(err instanceof Error ? err.message : "Request failed."); } finally { setBusy(""); }
  }

  async function saveCampaign() {
    if (!campaignId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/investor-growth/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_subject: edit.email_subject, email_body: edit.email_body, sms_body: edit.sms_body, social_post: edit.social_post, segment_id: selectedSegmentId,
          channel_mix_json: { email: config.email_enabled, sms: config.sms_enabled, social: config.social_enabled },
          approval_rules_json: {
            email: { required_role: config.email_role, steps: toN(config.email_steps), sla_hours: toN(config.email_sla_hours) },
            sms: { required_role: config.sms_role, steps: toN(config.sms_steps), sla_hours: toN(config.sms_sla_hours) },
            social: { required_role: config.social_role, steps: toN(config.social_steps), sla_hours: toN(config.social_sla_hours) },
          },
          compliance_state: config.compliance_state,
          compliance_hold_reason: config.compliance_hold_reason || null,
        }),
      });
      const payload = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(payload.error || "Failed to save campaign.");
      await refresh();
      message.success("Campaign saved.");
    } catch (err) { message.error(err instanceof Error ? err.message : "Failed to save campaign."); } finally { setSaving(false); }
  }

  const seg = campaign?.analytics?.segment_metrics_json?.all_segments as Record<string, unknown> | undefined;
  const coh = campaign?.analytics?.cohort_metrics_json?.current_campaign as Record<string, unknown> | undefined;
  const ai = campaign?.ai_strategy as Record<string, unknown> | undefined;
  const enterprise = ai?.enterprise_workspace as Record<string, unknown> | undefined;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Campaign Detail</h1>
          <div className={styles.headerActions}>
            <Link href="/investor-growth" className={styles.backLink}>Dashboard</Link>
            <Link href="/investor-growth/channels" className={styles.backLink}>Channels</Link>
            <Link href="/investor-growth/analytics" className={styles.backLink}>Analytics</Link>
          </div>
        </header>

        {loading ? <p className={styles.message}>Loading campaign...</p> : null}
        {!loading && error ? <p className={styles.error}>{error}</p> : null}

        {!loading && campaign ? (
          <section className={styles.layout}>
            <aside className={styles.leftColumn}>
              <article className={styles.card}>
                <h2 className={styles.sectionTitle}>Campaign Info</h2>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Company</span><span className={styles.infoValue}>{campaign.company_name || campaign.ticker || "-"}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Objective</span><span className={styles.infoValue}>{campaign.campaign_objective || "-"}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Audience</span><span className={styles.infoValue}>{campaign.audience_focus || "-"}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Tone</span><span className={styles.infoValue}>{campaign.tone || "-"}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Status</span><StatusBadge status={campaign.status} /></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Email Delivery</span><StatusBadge status={badge(campaign.email_delivery_status) as "draft"} /></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Compliance</span><span className={styles.infoValue}>{campaign.compliance_state || "-"}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Approval Steps</span><span className={styles.infoValue}>{campaign.approval_chain?.length ?? 0}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Approval Lock</span><span className={styles.infoValue}>{fmt(campaign.content_locked_at ?? null)}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Invalidated</span><span className={styles.infoValue}>{campaign.post_approval_edit_invalidated ? "Yes" : "No"}</span></div>
                <div className={styles.infoRow}><span className={styles.infoLabel}>Created</span><span className={styles.infoValue}>{fmt(campaign.created_at)}</span></div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Segment</span>
                  <select className={styles.segmentSelect} value={selectedSegmentId ?? ""} onChange={(e) => setSelectedSegmentId(e.target.value || null)}>
                    <option value="">None</option>{segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className={styles.block}><h3 className={styles.blockTitle}>Compliance State</h3><select className={styles.segmentSelect} value={config.compliance_state} onChange={(e) => setConfig((c) => ({ ...c, compliance_state: e.target.value }))}><option value="clear">clear</option><option value="in_review">in_review</option><option value="approved">approved</option><option value="review_required">review_required</option><option value="hold">hold</option><option value="changes_requested">changes_requested</option></select></div>
                <div className={styles.block}><h3 className={styles.blockTitle}>Hold Reason</h3><textarea className={styles.textarea} value={config.compliance_hold_reason} onChange={(e) => setConfig((c) => ({ ...c, compliance_hold_reason: e.target.value }))} /></div>
                <button className={styles.saveButton} onClick={() => void saveCampaign()} disabled={saving}>{saving ? "Saving..." : "Save Campaign"}</button>
                {(campaign.status === "draft" || campaign.status === "rejected") ? <button className={styles.submitButton} onClick={() => void post(`/api/investor-growth/campaigns/${campaignId}/submit`, {}, "Campaign submitted for approval.", "submit")} disabled={busy === "submit"}>{busy === "submit" ? "Submitting..." : "Submit for Approval"}</button> : null}
                {campaign.status === "pending_approval" ? <div className={styles.approvalActions}><button className={styles.approveButton} onClick={() => void post(`/api/investor-growth/campaigns/${campaignId}/approve`, { decision_notes: "" }, "Campaign approved.", "approve")} disabled={busy === "approve"}>{busy === "approve" ? "Processing..." : "Approve"}</button><button className={styles.rejectButton} onClick={() => void post(`/api/investor-growth/campaigns/${campaignId}/reject`, { decision_notes: "" }, "Campaign rejected.", "reject")} disabled={busy === "reject"}>{busy === "reject" ? "Processing..." : "Reject"}</button></div> : null}
              </article>
            </aside>

            <div className={styles.rightColumn}>
              <article className={styles.card}>
                <h2 className={styles.sectionTitle}>Generated Content</h2>
                <div className={styles.block}><h3 className={styles.blockTitle}>Strategy</h3><p className={styles.body}>{campaign.strategy || "-"}</p></div>
                <div className={styles.block}><h3 className={styles.blockTitle}>Email Subject</h3><input className={styles.input} value={edit.email_subject} onChange={(e) => setEdit((v) => ({ ...v, email_subject: e.target.value }))} /></div>
                <div className={styles.block}><h3 className={styles.blockTitle}>Email Draft</h3><textarea className={styles.textarea} value={edit.email_body} onChange={(e) => setEdit((v) => ({ ...v, email_body: e.target.value }))} /></div>
                <div className={styles.block}><h3 className={styles.blockTitle}>SMS Draft</h3><textarea className={styles.textarea} value={edit.sms_body} onChange={(e) => setEdit((v) => ({ ...v, sms_body: e.target.value }))} /></div>
                <div className={styles.block}><h3 className={styles.blockTitle}>Social Post</h3><textarea className={styles.textarea} value={edit.social_post} onChange={(e) => setEdit((v) => ({ ...v, social_post: e.target.value }))} /></div>
              </article>

              <article className={styles.card}>
                <h2 className={styles.sectionTitle}>Channel Mix + Approval Rules</h2>
                <div className={styles.checkboxGrid}>
                  <label className={styles.checkboxItem}><input type="checkbox" checked={config.email_enabled} onChange={(e) => setConfig((c) => ({ ...c, email_enabled: e.target.checked }))} /><span>Email</span></label>
                  <label className={styles.checkboxItem}><input type="checkbox" checked={config.sms_enabled} onChange={(e) => setConfig((c) => ({ ...c, sms_enabled: e.target.checked }))} /><span>SMS</span></label>
                  <label className={styles.checkboxItem}><input type="checkbox" checked={config.social_enabled} onChange={(e) => setConfig((c) => ({ ...c, social_enabled: e.target.checked }))} /><span>Social</span></label>
                </div>
                <div className={styles.ruleGrid}>
                  <div className={styles.ruleCard}><h3 className={styles.blockTitle}>Email Rule</h3><input className={styles.input} value={config.email_role} onChange={(e) => setConfig((c) => ({ ...c, email_role: e.target.value }))} placeholder="role" /><input className={styles.input} value={config.email_steps} onChange={(e) => setConfig((c) => ({ ...c, email_steps: e.target.value }))} placeholder="steps" /><input className={styles.input} value={config.email_sla_hours} onChange={(e) => setConfig((c) => ({ ...c, email_sla_hours: e.target.value }))} placeholder="sla hours" /></div>
                  <div className={styles.ruleCard}><h3 className={styles.blockTitle}>SMS Rule</h3><input className={styles.input} value={config.sms_role} onChange={(e) => setConfig((c) => ({ ...c, sms_role: e.target.value }))} placeholder="role" /><input className={styles.input} value={config.sms_steps} onChange={(e) => setConfig((c) => ({ ...c, sms_steps: e.target.value }))} placeholder="steps" /><input className={styles.input} value={config.sms_sla_hours} onChange={(e) => setConfig((c) => ({ ...c, sms_sla_hours: e.target.value }))} placeholder="sla hours" /></div>
                  <div className={styles.ruleCard}><h3 className={styles.blockTitle}>Social Rule</h3><input className={styles.input} value={config.social_role} onChange={(e) => setConfig((c) => ({ ...c, social_role: e.target.value }))} placeholder="role" /><input className={styles.input} value={config.social_steps} onChange={(e) => setConfig((c) => ({ ...c, social_steps: e.target.value }))} placeholder="steps" /><input className={styles.input} value={config.social_sla_hours} onChange={(e) => setConfig((c) => ({ ...c, social_sla_hours: e.target.value }))} placeholder="sla hours" /></div>
                </div>
              </article>

              <article className={styles.card}>
                <h2 className={styles.sectionTitle}>Unified Execution Dashboard</h2>
                <div className={styles.metricsInline}><div className={styles.metricPill}>Sent {num(campaign.analytics?.metrics_json?.sent)}</div><div className={styles.metricPill}>Opens {num(campaign.analytics?.metrics_json?.opens)}</div><div className={styles.metricPill}>Clicks {num(campaign.analytics?.metrics_json?.clicks)}</div><div className={styles.metricPill}>Replies {num(campaign.analytics?.metrics_json?.replies)}</div><div className={styles.metricPill}>Score {num(campaign.analytics?.metrics_json?.engagement_score)}</div></div>
                <div className={styles.analyticsGrid}>
                  <div className={styles.analyticsCard}><h3 className={styles.blockTitle}>Segment</h3><p className={styles.body}>Sends: {num(seg?.sends)}<br />Clicks: {num(seg?.clicks)}<br />Replies: {num(seg?.replies)}<br />Score: {num(seg?.engagement_score)}</p></div>
                  <div className={styles.analyticsCard}><h3 className={styles.blockTitle}>Cohort</h3><p className={styles.body}>Send rate: {num(coh?.send_rate)}%<br />Failure rate: {num(coh?.failure_rate)}%</p></div>
                  <div className={styles.analyticsCard}><h3 className={styles.blockTitle}>Funnel</h3><p className={styles.body}>Approvals: {num(campaign.analytics?.funnel_json?.approvals)}<br />Scheduled: {num(campaign.analytics?.funnel_json?.scheduled)}<br />Delivered: {num(campaign.analytics?.funnel_json?.delivered)}<br />Engaged: {num(campaign.analytics?.funnel_json?.engaged)}</p></div>
                  <div className={styles.analyticsCard}><h3 className={styles.blockTitle}>Top Content</h3><p className={styles.body}>Best channel: {num(campaign.analytics?.top_content_json?.best_channel)}<br />Variants: {num(campaign.analytics?.top_content_json?.total_variants)}<br />Trend score: {num(campaign.analytics?.trend_json?.engagement_last_snapshot)}</p></div>
                </div>
              </article>

              <article className={styles.card}>
                <h2 className={styles.sectionTitle}>AI Strategy Engine</h2>
                <div className={styles.analyticsGrid}>
                  <div className={styles.analyticsCard}><h3 className={styles.blockTitle}>Summary</h3><p className={styles.body}>{String(ai?.summary ?? "-")}</p></div>
                  <div className={styles.analyticsCard}><h3 className={styles.blockTitle}>Audience + Timing</h3><p className={styles.body}>Audience: {String(ai?.audience_selection_recommendation ?? "-")}<br />Timing: {String(ai?.timing_recommendation ?? "-")}</p></div>
                  <div className={styles.analyticsCard}><h3 className={styles.blockTitle}>Variants + Mix</h3><p className={styles.body}>Variants: {listText(ai?.content_variant_recommendations)}<br />Mix: {String(ai?.channel_mix_recommendation ?? "-")}</p></div>
                  <div className={styles.analyticsCard}><h3 className={styles.blockTitle}>Risk Flags</h3><p className={styles.body}>{listText(ai?.campaign_risk_flags)}</p></div>
                </div>
                <div className={styles.block}><h3 className={styles.blockTitle}>Explainable Summary</h3><p className={styles.body}>{String(ai?.explainable_summary ?? "-")}</p></div>
              </article>

              <article className={styles.card}>
                <h2 className={styles.sectionTitle}>Enterprise IR Workspace</h2>
                <div className={styles.analyticsGrid}>
                  <div className={styles.analyticsCard}><h3 className={styles.blockTitle}>Deal Room Hooks</h3><p className={styles.body}>{listText(enterprise?.deal_room_hooks)}</p></div>
                  <div className={styles.analyticsCard}><h3 className={styles.blockTitle}>Board Exports</h3><p className={styles.body}>{listText(enterprise?.board_level_reporting_exports)}</p></div>
                  <div className={styles.analyticsCard}><h3 className={styles.blockTitle}>Controls + Modules</h3><p className={styles.body}>Controls: {listText(enterprise?.enterprise_user_controls)}<br />Modules: {listText(enterprise?.premium_reporting_and_governance_modules)}</p></div>
                  <div className={styles.analyticsCard}><h3 className={styles.blockTitle}>Integrations</h3><p className={styles.body}>CRM/API: {listText(enterprise?.crm_api_integrations)}<br />Enrichment: {listText(enterprise?.external_data_enrichment_connectors)}</p></div>
                </div>
              </article>

              <article className={styles.card}>
                <h2 className={styles.sectionTitle}>Execution Controls</h2>
                {!approvalGranted ? <div className={styles.warningBox}>Approval is required before execution.</div> : null}
                <div className={styles.executionGrid}>
                  <div className={styles.executionCard}><h3 className={styles.blockTitle}>Email</h3><input className={styles.input} value={emailSend.recipient_name} onChange={(e) => setEmailSend((v) => ({ ...v, recipient_name: e.target.value }))} placeholder="Recipient name" /><input className={styles.input} value={emailSend.recipient_email} onChange={(e) => setEmailSend((v) => ({ ...v, recipient_email: e.target.value }))} placeholder="investor@example.com" /><button className={styles.sendButton} onClick={() => void post(`/api/investor-growth/campaigns/${campaignId}/send-email`, { recipient_name: emailSend.recipient_name, recipient_email: emailSend.recipient_email, subject: edit.email_subject, body: edit.email_body }, "Email sent successfully.", "email")} disabled={!approvalGranted || busy === "email" || !emailSend.recipient_email || !edit.email_subject || !edit.email_body}>{busy === "email" ? "Sending..." : "Send Email"}</button></div>
                  <div className={styles.executionCard}><h3 className={styles.blockTitle}>SMS</h3><select className={styles.segmentSelect} value={sms.template_name} onChange={(e) => setSms((v) => ({ ...v, template_name: e.target.value }))}>{smsTemplates.length === 0 ? <option value="investor_sms">investor_sms</option> : smsTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select><input className={styles.input} value={sms.recipient_name} onChange={(e) => setSms((v) => ({ ...v, recipient_name: e.target.value }))} placeholder="Recipient name" /><input className={styles.input} value={sms.recipient_phone} onChange={(e) => setSms((v) => ({ ...v, recipient_phone: e.target.value }))} placeholder="+1 555 555 5555" /><input className={styles.input} type="datetime-local" value={sms.scheduled_for} onChange={(e) => setSms((v) => ({ ...v, scheduled_for: e.target.value }))} /><button className={styles.sendButton} onClick={() => void post("/api/investor-growth/sms/send", { campaign_id: campaignId, recipient_name: sms.recipient_name, recipient_phone: sms.recipient_phone, body: edit.sms_body, scheduled_for: sms.scheduled_for || undefined, template_name: sms.template_name }, sms.scheduled_for ? "SMS scheduled successfully." : "SMS sent successfully.", "sms")} disabled={!approvalGranted || busy === "sms" || !sms.recipient_phone || !edit.sms_body}>{busy === "sms" ? "Working..." : sms.scheduled_for ? "Schedule SMS" : "Send SMS"}</button></div>
                  <div className={styles.executionCard}><h3 className={styles.blockTitle}>Social</h3><select className={styles.segmentSelect} value={social.platform} onChange={(e) => setSocial((v) => ({ ...v, platform: e.target.value, template_name: `${e.target.value}_default` }))}><option value="linkedin">linkedin</option><option value="x">x</option><option value="facebook">facebook</option></select><input className={styles.input} value={social.template_name} onChange={(e) => setSocial((v) => ({ ...v, template_name: e.target.value }))} placeholder="template name" /><input className={styles.input} type="datetime-local" value={social.scheduled_for} onChange={(e) => setSocial((v) => ({ ...v, scheduled_for: e.target.value }))} /><div className={styles.buttonRow}><button className={styles.secondaryButton} onClick={() => void post("/api/investor-growth/social/drafts", { campaign_id: campaignId, platform: social.platform, draft_content: edit.social_post, template_name: social.template_name, scheduled_for: social.scheduled_for || undefined, publish_now: false }, "Social draft saved.", "social-draft")} disabled={busy === "social-draft" || !edit.social_post}>{busy === "social-draft" ? "Saving..." : "Save Draft"}</button><button className={styles.sendButton} onClick={() => void post("/api/investor-growth/social/drafts", { campaign_id: campaignId, platform: social.platform, draft_content: edit.social_post, template_name: social.template_name, scheduled_for: social.scheduled_for || undefined, publish_now: true }, "Social post published.", "social-publish")} disabled={!approvalGranted || busy === "social-publish" || !edit.social_post}>{busy === "social-publish" ? "Publishing..." : "Publish Now"}</button></div></div>
                </div>
              </article>

              <article className={styles.card}>
                <h2 className={styles.sectionTitle}>Engagement Tracking</h2>
                <p className={styles.helperCopy}>Record opens, clicks, and replies to refresh funnel and trend analytics.</p>
                <div className={styles.executionCard}><select className={styles.segmentSelect} value={metrics.channel} onChange={(e) => setMetrics((v) => ({ ...v, channel: e.target.value, platform: e.target.value === "email" ? "resend" : e.target.value === "sms" ? "manual" : "linkedin" }))}><option value="email">email</option><option value="sms">sms</option><option value="social">social</option></select><input className={styles.input} value={metrics.platform} onChange={(e) => setMetrics((v) => ({ ...v, platform: e.target.value }))} placeholder="platform" /><input className={styles.input} value={metrics.opens} onChange={(e) => setMetrics((v) => ({ ...v, opens: e.target.value }))} placeholder="opens" /><input className={styles.input} value={metrics.clicks} onChange={(e) => setMetrics((v) => ({ ...v, clicks: e.target.value }))} placeholder="clicks" /><input className={styles.input} value={metrics.replies} onChange={(e) => setMetrics((v) => ({ ...v, replies: e.target.value }))} placeholder="replies" /><button className={styles.sendButton} onClick={() => void post(`/api/investor-growth/campaigns/${campaignId}/metrics`, { channel: metrics.channel, platform: metrics.platform, opens: toN(metrics.opens), clicks: toN(metrics.clicks), replies: toN(metrics.replies) }, "Engagement metrics recorded.", "metrics")} disabled={busy === "metrics"}>{busy === "metrics" ? "Recording..." : "Record Metrics"}</button></div>
              </article>

              <article className={styles.card}>
                <h2 className={styles.sectionTitle}>Channel Activity</h2>
                {campaign.channel_executions?.length ? <div className={styles.historyList}>{campaign.channel_executions.map((x) => <div key={x.id} className={styles.historyItem}><div className={styles.historyTopRow}><strong>{x.channel}{x.platform ? ` / ${x.platform}` : ""}</strong><span>{x.delivery_status}</span></div><p className={styles.historyMeta}>Approval: {x.approval_status}</p><p className={styles.historyMeta}>Schedule: {x.scheduled_for || "Not scheduled"}</p><p className={styles.historyMeta}>Template: {x.template_name || "-"}</p></div>)}</div> : <p className={styles.message}>No multi-channel activity recorded yet.</p>}
              </article>

              <article className={styles.card}>
                <h2 className={styles.sectionTitle}>Delivery History</h2>
                {deliveryEvents.length === 0 ? <p className={styles.message}>No delivery attempts have been logged yet.</p> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Channel</th><th>Recipient</th><th>Status</th><th>Provider</th><th>Timestamp</th><th>Error</th></tr></thead><tbody>{deliveryEvents.map((event) => <tr key={event.id}><td>{event.channel}</td><td><div className={styles.recipientCell}><strong>{event.recipient || "-"}</strong><span>{event.recipient_name || "-"}</span></div></td><td><StatusBadge status={badge(event.status) as "draft"} /></td><td>{event.provider || "-"}</td><td>{fmt(event.timestamp)}</td><td>{event.error || "-"}</td></tr>)}</tbody></table></div>}
              </article>

              <article className={styles.card}>
                <h2 className={styles.sectionTitle}>Approval History</h2>
                {approvalHistory.length === 0 ? <p className={styles.message}>No approval events have been logged yet.</p> : <div className={styles.historyList}>{approvalHistory.map((item) => <div key={item.id} className={styles.historyItem}><div className={styles.historyTopRow}><strong>{item.label}</strong><span>{fmt(item.created_at)}</span></div><p className={styles.historyMeta}>Actor: {item.acted_by}</p><p className={styles.historyMeta}>Note: {item.note || "-"}</p></div>)}</div>}
                {campaign.approval_chain?.length ? <div className={styles.historyList}>{campaign.approval_chain.map((item) => <div key={`chain-${item.id}`} className={styles.historyItem}><div className={styles.historyTopRow}><strong>Step {item.step_number ?? "-"}</strong><span>{item.status}</span></div><p className={styles.historyMeta}>Channel: {item.channel || "-"}</p><p className={styles.historyMeta}>Role: {item.approver_role || "-"}</p><p className={styles.historyMeta}>SLA: {fmt(item.sla_due_at ?? null)} | Invalidated: {fmt(item.invalidated_at ?? null)}</p></div>)}</div> : null}
                <div className={styles.buttonRow}>
                  <Link href="/api/investor-growth/approvals/export?format=csv" className={styles.secondaryButton}>Export Approval CSV</Link>
                </div>
              </article>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
