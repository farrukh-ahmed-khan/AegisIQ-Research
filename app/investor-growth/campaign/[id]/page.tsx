"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  FileText,
  LoaderCircle,
  MessageSquare,
  ScrollText,
  Send,
  Target,
} from "lucide-react";
import styles from "./page.module.css";

type CampaignDetail = {
  id: string;
  ticker: string;
  company_name: string;
  campaign_objective: string;
  audience_focus: string;
  tone: string;
  notes: string;
  strategy: string;
  email_draft: string;
  sms_draft: string;
  social_post: string;
  created_at: string;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US");
}

export default function InvestorGrowthCampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params?.id;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

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

          throw new Error(payload.error || "Failed to load campaign details.");
        }

        const data = (await response.json()) as CampaignDetail;
        setCampaign(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load campaign details.";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    void loadCampaign();
  }, [campaignId]);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.hero}>
          <div>
            <h1 className={styles.title}>Campaign Detail</h1>
            <p className={styles.subtitle}>
              Review campaign information and generated investor outreach
              output.
            </p>
          </div>
          <Link href="/investor-growth/history" className={styles.backLink}>
            <ArrowLeft size={16} /> Back to History
          </Link>
        </header>

        {isLoading ? (
          <div className={styles.loaderWrap}>
            <LoaderCircle className={styles.loaderIcon} size={24} />
            <p className={styles.loaderText}>Loading campaign...</p>
          </div>
        ) : null}

        {!isLoading && error ? <p className={styles.error}>{error}</p> : null}

        {!isLoading && !error && campaign ? (
          <section className={styles.layout}>
            <aside className={styles.leftColumn}>
              <article className={styles.panel}>
                <h2 className={styles.sectionTitle}>
                  <FileText size={16} /> Campaign Info
                </h2>

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>
                    <Target size={14} /> Ticker
                  </span>
                  <span className={styles.infoValue}>
                    {campaign.ticker || "-"}
                  </span>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>
                    <Building2 size={14} /> Company Name
                  </span>
                  <span className={styles.infoValue}>
                    {campaign.company_name || "-"}
                  </span>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>
                    <Target size={14} /> Objective
                  </span>
                  <span className={styles.infoValue}>
                    {campaign.campaign_objective || "-"}
                  </span>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>
                    <CalendarDays size={14} /> Created
                  </span>
                  <span className={styles.infoValue}>
                    {formatDate(campaign.created_at)}
                  </span>
                </div>
              </article>
            </aside>

            <div className={styles.rightColumn}>
              <article className={styles.panel}>
                <h2 className={styles.sectionTitle}>
                  <ScrollText size={16} /> Strategy
                </h2>
                <p className={styles.body}>{campaign.strategy || "-"}</p>
              </article>

              <article className={styles.panel}>
                <h2 className={styles.sectionTitle}>
                  <Send size={16} /> Email Draft
                </h2>
                <p className={styles.body}>{campaign.email_draft || "-"}</p>
              </article>

              <article className={styles.panel}>
                <h2 className={styles.sectionTitle}>
                  <MessageSquare size={16} /> SMS Draft
                </h2>
                <p className={styles.body}>{campaign.sms_draft || "-"}</p>
              </article>

              <article className={styles.panel}>
                <h2 className={styles.sectionTitle}>
                  <FileText size={16} /> Social Post
                </h2>
                <p className={styles.body}>{campaign.social_post || "-"}</p>
              </article>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
