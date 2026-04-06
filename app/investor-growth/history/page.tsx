"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  LoaderCircle,
  Rocket,
  Target,
} from "lucide-react";
import styles from "./page.module.css";

type CampaignHistoryItem = {
  id: string;
  ticker: string;
  company_name: string;
  campaign_objective: string;
  created_at: string;
};

type CampaignHistoryApiResponse = {
  campaigns: CampaignHistoryItem[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-US");
}

export default function InvestorGrowthHistoryPage() {
  const [campaigns, setCampaigns] = useState<CampaignHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  useEffect(() => {
    async function loadCampaigns(activePage: number) {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/investor-growth/campaigns?page=${activePage}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(payload.error || "Failed to load campaigns.");
        }

        const data = (await response.json()) as CampaignHistoryApiResponse;
        setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
        setTotalPages(
          Number.isFinite(data.pagination?.total_pages)
            ? Math.max(1, data.pagination.total_pages)
            : 1,
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load campaigns.";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    void loadCampaigns(page);
  }, [page]);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Investor Campaign History</h1>
          <p className={styles.subtitle}>
            Browse previously generated investor outreach campaigns.
          </p>
          <Link href="/investor-growth" className={styles.backLink}>
            Back to Dashboard
          </Link>
          <Link href="/investor-growth/generate" className={styles.backLink}>
            Create Campaign
          </Link>
          <Link href="/investor-growth/campaigns" className={styles.backLink}>
            Open Campaign Dashboard
          </Link>
        </header>

        {isLoading ? (
          <div className={styles.loaderWrap}>
            <LoaderCircle className={styles.loaderIcon} size={24} />
            <p className={styles.loaderText}>Loading campaigns...</p>
          </div>
        ) : null}
        {!isLoading && error ? <p className={styles.error}>{error}</p> : null}
        {!isLoading && !error && campaigns.length === 0 ? (
          <p className={styles.message}>No campaigns created yet.</p>
        ) : null}

        {!isLoading && !error && campaigns.length > 0 ? (
          <>
            <div className={styles.list}>
              {campaigns.map((campaign) => (
                <article key={campaign.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.badge}>
                      <Rocket size={14} />
                      <span>Campaign</span>
                    </div>
                    <span className={styles.idTag}>
                      #{campaign.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className={styles.row}>
                    <span className={styles.label}>
                      <Target size={14} /> Ticker
                    </span>
                    <span className={styles.value}>
                      {campaign.ticker || "-"}
                    </span>
                  </div>

                  <div className={styles.row}>
                    <span className={styles.label}>
                      <Building2 size={14} /> Company Name
                    </span>
                    <span className={styles.value}>
                      {campaign.company_name || "-"}
                    </span>
                  </div>

                  <div className={styles.row}>
                    <span className={styles.label}>
                      <Target size={14} /> Campaign Objective
                    </span>
                    <span className={styles.value}>
                      {campaign.campaign_objective || "-"}
                    </span>
                  </div>

                  <div className={styles.row}>
                    <span className={styles.label}>
                      <CalendarDays size={14} /> Created Date
                    </span>
                    <span className={styles.value}>
                      {formatDate(campaign.created_at)}
                    </span>
                  </div>

                  <Link
                    href={`/investor-growth/campaigns/${campaign.id}`}
                    className={styles.button}
                  >
                    View Campaign
                  </Link>
                </article>
              ))}
            </div>

            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.paginationButton}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || isLoading}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className={styles.paginationButton}
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={page >= totalPages || isLoading}
              >
                Next
              </button>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
