"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./page.module.css";

type CampaignItem = {
  id: string;
  ticker: string;
  company_name: string;
  campaign_objective: string;
  status: "draft" | "pending_approval" | "approved" | "rejected" | string;
  created_at: string;
};

type CampaignsApiResponse = {
  campaigns: CampaignItem[];
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

export default function InvestorGrowthCampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function loadCampaigns() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/investor-growth/campaigns?page=${page}`,
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

        const data = (await response.json()) as CampaignsApiResponse;
        setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
        setTotalPages(Math.max(1, Number(data.pagination?.total_pages) || 1));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load campaigns.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadCampaigns();
  }, [page]);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Campaign Dashboard</h1>
          <p className={styles.subtitle}>
            Track and manage saved investor campaigns.
          </p>
          <Link href="/investor-growth" className={styles.backLink}>
            Back to Generator
          </Link>
        </header>

        {isLoading ? (
          <p className={styles.message}>Loading campaigns...</p>
        ) : null}
        {!isLoading && error ? <p className={styles.error}>{error}</p> : null}
        {!isLoading && !error && campaigns.length === 0 ? (
          <p className={styles.message}>No campaigns created yet.</p>
        ) : null}

        {!isLoading && !error && campaigns.length > 0 ? (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Company Name</th>
                    <th>Objective</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td>{campaign.ticker || "-"}</td>
                      <td>{campaign.company_name || "-"}</td>
                      <td>{campaign.campaign_objective || "-"}</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${getStatusClass(campaign.status)}`}
                        >
                          {campaign.status}
                        </span>
                      </td>
                      <td>{formatDate(campaign.created_at)}</td>
                      <td>
                        <Link
                          href={`/investor-growth/campaigns/${campaign.id}`}
                          className={styles.viewButton}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
