"use client";

import React, { useState } from "react";
import { message } from "antd";
import styles from "./campaign-detail-client.module.css";
import Panel from "./panel";
import FormField from "./form-field";
import TextAreaField from "./text-area-field";
import StatusBadge from "./status-badge";

interface CampaignData {
  id: string;
  ticker: string;
  company_name: string;
  campaign_objective: string;
  audience_focus: string;
  tone: string;
  notes: string;
  status: string;
  email_delivery_status: string;
  strategy: string;
  email_subject: string;
  email_draft: string;
  sms_draft: string;
  social_post: string;
  created_at: string;
}

interface CampaignDetailClientProps {
  campaign: CampaignData;
  className?: string;
}

export default function CampaignDetailClient({
  campaign,
  className = "",
}: CampaignDetailClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    email_subject: campaign.email_subject,
    email_draft: campaign.email_draft,
    sms_draft: campaign.sms_draft,
    social_post: campaign.social_post,
  });

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/investor-growth/campaigns/${campaign.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editData),
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to save changes");
      }

      message.success("Campaign updated successfully");
      setIsEditing(false);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`${styles.detail} ${className}`}>
      {/* Campaign Overview */}
      <Panel>
        <div className={styles.overview}>
          <div className={styles.overviewItem}>
            <label>Company</label>
            <p>{campaign.company_name}</p>
          </div>
          <div className={styles.overviewItem}>
            <label>Ticker</label>
            <p>{campaign.ticker}</p>
          </div>
          <div className={styles.overviewItem}>
            <label>Status</label>
            <div className={styles.statusContainer}>
              <StatusBadge status={campaign.status as any} />
            </div>
          </div>
          <div className={styles.overviewItem}>
            <label>Created</label>
            <p>{new Date(campaign.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </Panel>

      {/* Campaign Strategy */}
      <Panel title="Campaign Strategy" className={styles.strategyPanel}>
        <div className={styles.strategyContent}>
          <p>{campaign.strategy}</p>
        </div>
      </Panel>

      {/* Edit Campaign Content */}
      <Panel
        title={isEditing ? "Edit Campaign Content" : "Campaign Content"}
        action={
          !isEditing && (
            <button
              className={styles.editButton}
              onClick={() => setIsEditing(true)}
            >
              Edit Content
            </button>
          )
        }
      >
        {isEditing ? (
          <div className={styles.editForm}>
            <FormField label="Email Subject" required>
              <input
                type="text"
                value={editData.email_subject}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    email_subject: e.target.value,
                  })
                }
                disabled={isSaving}
              />
            </FormField>

            <TextAreaField
              label="Email Body"
              value={editData.email_draft}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  email_draft: e.target.value,
                })
              }
              rows={6}
            />

            <TextAreaField
              label="SMS Message"
              value={editData.sms_draft}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  sms_draft: e.target.value,
                })
              }
              rows={3}
            />

            <TextAreaField
              label="Social Post"
              value={editData.social_post}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  social_post: e.target.value,
                })
              }
              rows={4}
            />

            <div className={styles.editActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className={styles.saveButton}
                onClick={handleSaveChanges}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.contentDisplay}>
            <div className={styles.contentSection}>
              <h4>Email</h4>
              <div className={styles.contentBox}>
                <strong>{campaign.email_subject}</strong>
                <p>{campaign.email_draft}</p>
              </div>
            </div>

            <div className={styles.contentSection}>
              <h4>SMS</h4>
              <div className={styles.contentBox}>
                <p>{campaign.sms_draft}</p>
              </div>
            </div>

            <div className={styles.contentSection}>
              <h4>Social Post</h4>
              <div className={styles.contentBox}>
                <p>{campaign.social_post}</p>
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
