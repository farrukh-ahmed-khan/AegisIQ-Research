"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CampaignsTable from "../../../components/investor-growth/campaigns-table";
import MetricCard from "../../../components/investor-growth/metric-card";
import Panel from "../../../components/investor-growth/panel";
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

        <div className={styles.metricsRow}>
          <MetricCard
            label="Current Page Items"
            value={isLoading ? "--" : campaigns.length}
          />
          <MetricCard label="Current Page" value={page} />
          <MetricCard label="Total Pages" value={totalPages} />
        </div>

        <Panel title="Campaigns">
          {error ? (
            <p className={styles.error}>{error}</p>
          ) : (
            <>
              <CampaignsTable
                campaigns={campaigns}
                isLoading={isLoading}
                className={styles.tableSection}
              />

              {!isLoading && campaigns.length > 0 && (
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
              )}
            </>
          )}
        </Panel>
      </div>
    </main>
  );
}
