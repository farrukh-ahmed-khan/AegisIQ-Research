"use client";

import { useState } from "react";
import styles from "./channel-editor-tabs.module.css";

type ChannelMix = {
  email: boolean;
  sms: boolean;
  social: boolean;
};

type EditState = {
  email_subject: string;
  email_body: string;
  sms_body: string;
  social_post: string;
};

type SmsState = {
  recipient_name: string;
  recipient_phone: string;
  scheduled_for: string;
  template_name: string;
};

type SocialState = {
  platform: string;
  template_name: string;
  scheduled_for: string;
};

type EmailSendState = {
  recipient_name: string;
  recipient_email: string;
};

type SmsTemplate = { id: string; name: string };

type Props = {
  channelMix: ChannelMix;
  edit: EditState;
  onEditChange: (next: EditState) => void;
  emailSend: EmailSendState;
  onEmailSendChange: (next: EmailSendState) => void;
  sms: SmsState;
  onSmsChange: (next: SmsState) => void;
  social: SocialState;
  onSocialChange: (next: SocialState) => void;
  smsTemplates: SmsTemplate[];
  approvalGranted: boolean;
  busy: string;
  campaignId: string;
  onPost: (
    url: string,
    body: Record<string, unknown>,
    success: string,
    tag: string,
  ) => Promise<void>;
};

type TabKey = "email" | "sms" | "social";

const SMS_LIMIT = 160;

function socialMode(platform: string): string {
  return platform === "facebook"
    ? "live publish if configured"
    : "manual / log only";
}

export default function ChannelEditorTabs({
  channelMix,
  edit,
  onEditChange,
  emailSend,
  onEmailSendChange,
  sms,
  onSmsChange,
  social,
  onSocialChange,
  smsTemplates,
  approvalGranted,
  busy,
  campaignId,
  onPost,
}: Props) {
  const tabs: { key: TabKey; label: string; enabled: boolean }[] = [
    { key: "email", label: "Email", enabled: channelMix.email },
    { key: "sms", label: "SMS", enabled: channelMix.sms },
    { key: "social", label: "Social", enabled: channelMix.social },
  ];

  const firstEnabled = tabs.find((t) => t.enabled)?.key ?? "email";
  const [activeTab, setActiveTab] = useState<TabKey>(firstEnabled);

  const smsLen = edit.sms_body.length;
  const smsOver = smsLen > SMS_LIMIT;

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""} ${!tab.enabled ? styles.tabDisabled : ""}`}
            onClick={() => {
              if (tab.enabled) setActiveTab(tab.key);
            }}
            disabled={!tab.enabled}
          >
            {tab.label}
            <span
              className={`${styles.badge} ${activeTab === tab.key ? styles.badgeActive : ""}`}
            >
              {tab.key === "email" && tab.enabled
                ? (edit.email_body ? "draft" : "empty")
                : null}
              {tab.key === "sms" && tab.enabled
                ? `${smsLen}/${SMS_LIMIT}`
                : null}
              {tab.key === "social" && tab.enabled
                ? (edit.social_post ? social.platform : "empty")
                : null}
              {!tab.enabled ? "off" : null}
            </span>
          </button>
        ))}
      </div>

      {/* Email Tab */}
      {activeTab === "email" ? (
        <div className={styles.panel}>
          {!approvalGranted ? (
            <div className={styles.warningBox}>
              Approval required before sending email.
            </div>
          ) : null}
          <div className={styles.row}>
            <label className={styles.label}>Email Subject</label>
            <input
              className={styles.input}
              value={edit.email_subject}
              onChange={(e) =>
                onEditChange({ ...edit, email_subject: e.target.value })
              }
              placeholder="Subject line for investor outreach..."
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Email Body</label>
            <textarea
              className={styles.textarea}
              rows={7}
              value={edit.email_body}
              onChange={(e) =>
                onEditChange({ ...edit, email_body: e.target.value })
              }
              placeholder="Email body content..."
            />
          </div>
          <hr className={styles.divider} />
          <p className={styles.helperText}>
            Sends live via Resend. External recipients are blocked until your
            domain is verified in Resend.
          </p>
          <div className={styles.row}>
            <label className={styles.label}>Recipient Name</label>
            <input
              className={styles.input}
              value={emailSend.recipient_name}
              onChange={(e) =>
                onEmailSendChange({ ...emailSend, recipient_name: e.target.value })
              }
              placeholder="Investor name"
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Recipient Email</label>
            <input
              className={styles.input}
              type="email"
              value={emailSend.recipient_email}
              onChange={(e) =>
                onEmailSendChange({ ...emailSend, recipient_email: e.target.value })
              }
              placeholder="investor@example.com"
            />
          </div>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.sendBtn}
              onClick={() =>
                void onPost(
                  `/api/investor-growth/campaigns/${campaignId}/send-email`,
                  {
                    recipient_name: emailSend.recipient_name,
                    recipient_email: emailSend.recipient_email,
                    subject: edit.email_subject,
                    body: edit.email_body,
                  },
                  "Email sent successfully.",
                  "email",
                )
              }
              disabled={
                !approvalGranted ||
                busy === "email" ||
                !emailSend.recipient_email ||
                !edit.email_subject ||
                !edit.email_body
              }
            >
              {busy === "email" ? "Sending..." : "Send Email"}
            </button>
          </div>
        </div>
      ) : null}

      {/* SMS Tab */}
      {activeTab === "sms" ? (
        <div className={styles.panel}>
          {!approvalGranted ? (
            <div className={styles.warningBox}>
              Approval required before sending SMS.
            </div>
          ) : null}
          <div className={styles.row}>
            <label className={styles.label}>SMS Draft</label>
            <textarea
              className={styles.textarea}
              rows={4}
              value={edit.sms_body}
              onChange={(e) =>
                onEditChange({ ...edit, sms_body: e.target.value })
              }
              placeholder="SMS message (160 chars per segment)..."
            />
            <p className={`${styles.charCount} ${smsOver ? styles.charOver : ""}`}>
              {smsLen}/{SMS_LIMIT}
              {smsLen > SMS_LIMIT ? ` (${Math.ceil(smsLen / SMS_LIMIT)} segments)` : ""}
            </p>
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Template</label>
            <select
              className={styles.select}
              value={sms.template_name}
              onChange={(e) => onSmsChange({ ...sms, template_name: e.target.value })}
            >
              {smsTemplates.length === 0 ? (
                <option value="investor_sms">investor_sms</option>
              ) : (
                smsTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <hr className={styles.divider} />
          <p className={styles.helperText}>
            Leave "Schedule For" empty to send immediately via Twilio. Set a
            future time to schedule — the message will be dispatched
            automatically within 1 minute of the scheduled time (deployed only;
            scheduling does not fire on localhost).
          </p>
          <div className={styles.row}>
            <label className={styles.label}>Recipient Name</label>
            <input
              className={styles.input}
              value={sms.recipient_name}
              onChange={(e) => onSmsChange({ ...sms, recipient_name: e.target.value })}
              placeholder="Investor name"
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Recipient Phone</label>
            <input
              className={styles.input}
              type="tel"
              value={sms.recipient_phone}
              onChange={(e) =>
                onSmsChange({ ...sms, recipient_phone: e.target.value })
              }
              placeholder="+1 555 555 5555"
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Schedule For (optional)</label>
            <div className={styles.scheduleRow}>
              <input
                className={styles.input}
                type="datetime-local"
                value={sms.scheduled_for}
                onChange={(e) =>
                  onSmsChange({ ...sms, scheduled_for: e.target.value })
                }
              />
              {sms.scheduled_for ? (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => onSmsChange({ ...sms, scheduled_for: "" })}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.sendBtn}
              onClick={() =>
                void onPost(
                  "/api/investor-growth/sms/send",
                  {
                    campaign_id: campaignId,
                    recipient_name: sms.recipient_name,
                    recipient_phone: sms.recipient_phone,
                    body: edit.sms_body,
                    scheduled_for: sms.scheduled_for || undefined,
                    template_name: sms.template_name,
                  },
                  sms.scheduled_for
                    ? "SMS scheduled successfully."
                    : "SMS sent successfully.",
                  "sms",
                )
              }
              disabled={
                !approvalGranted ||
                busy === "sms" ||
                !sms.recipient_phone ||
                !edit.sms_body
              }
            >
              {busy === "sms"
                ? "Working..."
                : sms.scheduled_for
                  ? "Schedule SMS"
                  : "Send SMS"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Social Tab */}
      {activeTab === "social" ? (
        <div className={styles.panel}>
          {!approvalGranted ? (
            <div className={styles.warningBox}>
              Approval required before publishing social content.
            </div>
          ) : null}
          <div className={styles.row}>
            <label className={styles.label}>Platform</label>
            <select
              className={styles.select}
              value={social.platform}
              onChange={(e) =>
                onSocialChange({
                  ...social,
                  platform: e.target.value,
                  template_name: `${e.target.value}_default`,
                })
              }
            >
              <option value="linkedin">LinkedIn (manual / log only)</option>
              <option value="x">X / Twitter (manual / log only)</option>
              <option value="facebook">Facebook (live if configured)</option>
            </select>
            <span className={styles.socialModeTag}>
              Mode: {socialMode(social.platform)}
            </span>
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Template Name</label>
            <input
              className={styles.input}
              value={social.template_name}
              onChange={(e) =>
                onSocialChange({ ...social, template_name: e.target.value })
              }
              placeholder="e.g. linkedin_default"
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Post Draft</label>
            <textarea
              className={styles.textarea}
              rows={6}
              value={edit.social_post}
              onChange={(e) =>
                onEditChange({ ...edit, social_post: e.target.value })
              }
              placeholder="Social post content..."
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Schedule For (optional)</label>
            <div className={styles.scheduleRow}>
              <input
                className={styles.input}
                type="datetime-local"
                value={social.scheduled_for}
                onChange={(e) =>
                  onSocialChange({ ...social, scheduled_for: e.target.value })
                }
              />
              {social.scheduled_for ? (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => onSocialChange({ ...social, scheduled_for: "" })}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
          <p className={styles.helperText}>
            Facebook: leave "Schedule For" empty to publish immediately, or set
            a time to schedule (auto-dispatched within 1 minute on deployed env).
            LinkedIn and X are workflow-log only — no live API.
          </p>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() =>
                void onPost(
                  "/api/investor-growth/social/drafts",
                  {
                    campaign_id: campaignId,
                    platform: social.platform,
                    draft_content: edit.social_post,
                    template_name: social.template_name,
                    scheduled_for: social.scheduled_for || undefined,
                    publish_now: false,
                  },
                  "Social draft saved.",
                  "social-draft",
                )
              }
              disabled={busy === "social-draft" || !edit.social_post}
            >
              {busy === "social-draft" ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="button"
              className={styles.sendBtn}
              onClick={() =>
                void onPost(
                  "/api/investor-growth/social/drafts",
                  {
                    campaign_id: campaignId,
                    platform: social.platform,
                    draft_content: edit.social_post,
                    template_name: social.template_name,
                    scheduled_for: social.scheduled_for || undefined,
                    publish_now: true,
                  },
                  social.platform === "facebook" && !social.scheduled_for
                    ? "Facebook post published."
                    : "Social workflow saved.",
                  "social-publish",
                )
              }
              disabled={
                !approvalGranted ||
                busy === "social-publish" ||
                !edit.social_post
              }
            >
              {busy === "social-publish"
                ? "Publishing..."
                : social.platform === "facebook" && !social.scheduled_for
                  ? "Publish Now"
                  : "Log Workflow"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
