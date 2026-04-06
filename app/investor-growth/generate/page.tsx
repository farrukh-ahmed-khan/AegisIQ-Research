"use client";

import Link from "next/link";
import { useState } from "react";
import { message } from "antd";
import Panel from "../../../components/investor-growth/panel";
import InvestorGrowthForm from "../../../components/investor-growth/InvestorGrowthForm";
import InvestorGrowthResultPanel from "../../../components/investor-growth/InvestorGrowthResultPanel";
import styles from "../page.module.css";

type FormData = {
  ticker: string;
  company_name: string;
  campaign_objective: string;
  audience_focus: string;
  tone: string;
  notes: string;
};

type GeneratedContent = {
  strategy: string;
  email_draft: string;
  sms_draft: string;
  social_post: string;
};

type SaveResponse = {
  id: string;
};

export default function InvestorGrowthGeneratePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [lastFormData, setLastFormData] = useState<FormData | null>(null);
  const [generatedContent, setGeneratedContent] =
    useState<GeneratedContent | null>(null);

  async function handleGenerateStrategy(formData: FormData): Promise<boolean> {
    setError("");
    setGeneratedContent(null);
    setCampaignId(null);

    const requiredFields: Array<keyof FormData> = [
      "ticker",
      "company_name",
      "campaign_objective",
      "audience_focus",
      "tone",
      "notes",
    ];

    const hasMissingField = requiredFields.some(
      (field) => !formData[field]?.trim(),
    );

    if (hasMissingField) {
      const validationError = "Please fill all required fields.";
      setError(validationError);
      message.error(validationError);
      return false;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/investor-growth/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Failed to generate strategy");
      }

      const result = (await response.json()) as GeneratedContent;
      setGeneratedContent({
        strategy: result.strategy,
        email_draft: result.email_draft,
        sms_draft: result.sms_draft,
        social_post: result.social_post,
      });
      setLastFormData({ ...formData });
      message.success("Strategy generated. You can now save campaign.");
      return true;
    } catch (err) {
      const errorText =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorText);
      message.error(errorText);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveCampaign() {
    if (!generatedContent || !lastFormData) {
      message.error("Generate strategy first.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/investor-growth/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...lastFormData,
          strategy: generatedContent.strategy,
          email_draft: generatedContent.email_draft,
          sms_draft: generatedContent.sms_draft,
          social_post: generatedContent.social_post,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Failed to save campaign.");
      }

      const data = (await response.json()) as SaveResponse;
      setCampaignId(data.id);
      message.success("Campaign saved successfully.");
    } catch (err) {
      const errorText =
        err instanceof Error ? err.message : "Failed to save campaign.";
      message.error(errorText);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Investor Growth Engine</h1>
          <p className={styles.subtitle}>
            Build campaign strategy and outreach drafts for investor relations
            workflows.
          </p>
          <div className={styles.actions}>
            <Link href="/investor-growth" className={styles.historyLink}>
              View Dashboard
            </Link>
            <Link
              href="/investor-growth/campaigns"
              className={styles.historyLink}
            >
              View Campaigns
            </Link>
          </div>
          {campaignId ? (
            <p className={styles.subtitle}>Saved Campaign ID: {campaignId}</p>
          ) : null}
        </header>

        <section className={styles.grid}>
          <Panel title="Campaign Input">
            <InvestorGrowthForm
              onSubmit={handleGenerateStrategy}
              isLoading={isLoading}
            />
          </Panel>
          <Panel title="Generated Output">
            <InvestorGrowthResultPanel
              content={generatedContent}
              isLoading={isLoading}
              isSaving={isSaving}
              onSave={handleSaveCampaign}
              canSave={Boolean(generatedContent && !campaignId)}
              campaignId={campaignId}
              error={error}
            />
          </Panel>
        </section>
      </div>
    </main>
  );
}
