import React from "react";
import Link from "next/link";
import StatusBadge from "./status-badge";
import styles from "./campaigns-table.module.css";

interface Campaign {
  id: string;
  ticker: string;
  company_name: string;
  campaign_objective: string;
  status: "draft" | "pending_approval" | "approved" | "rejected" | string;
  created_at: string;
}

interface CampaignsTableProps {
  campaigns: Campaign[];
  isLoading?: boolean;
  className?: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function CampaignsTable({
  campaigns,
  isLoading = false,
  className = "",
}: CampaignsTableProps) {
  if (isLoading) {
    return (
      <div className={`${styles.table} ${className}`}>
        <div className={styles.loading}>Loading campaigns...</div>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className={`${styles.table} ${className}`}>
        <div className={styles.empty}>
          No campaigns yet. Create your first campaign to get started.
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.tableWrapper} ${className}`}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Company</th>
            <th>Objective</th>
            <th>Status</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr key={campaign.id}>
              <td>
                <div className={styles.companyCell}>
                  <strong>{campaign.company_name}</strong>
                  <span className={styles.ticker}>{campaign.ticker}</span>
                </div>
              </td>
              <td className={styles.objectiveCell}>
                {campaign.campaign_objective}
              </td>
              <td>
                <StatusBadge status={campaign.status as any} />
              </td>
              <td>{formatDate(campaign.created_at)}</td>
              <td>
                <Link
                  href={`/investor-growth/campaigns/${campaign.id}`}
                  className={styles.link}
                >
                  View Details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
