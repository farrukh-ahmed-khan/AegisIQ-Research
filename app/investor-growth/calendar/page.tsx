"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./calendar.module.css";

type CalendarItem = {
  id: string;
  campaign_id: string;
  company_name: string;
  ticker: string;
  channel: string;
  platform: string | null;
  scheduled_for: string | null;
  delivery_status: string;
  approval_status: string;
  template_name: string | null;
};

type Payload = {
  items: CalendarItem[];
  counts: {
    scheduled: number;
    pending_approval: number;
  };
};

export default function InvestorGrowthCalendarPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/investor-growth/calendar", {
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(payload.error || "Failed to load calendar.");
        }

        setData((await response.json()) as Payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load calendar.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Posting Calendar</h1>
            <p className={styles.subtitle}>
              Track scheduled SMS and social touches across investor campaigns.
            </p>
          </div>
          <div className={styles.actions}>
            <Link href="/investor-growth/channels" className={styles.link}>
              Channels
            </Link>
            <Link href="/investor-growth" className={styles.linkSecondary}>
              Dashboard
            </Link>
          </div>
        </header>

        <section className={styles.metrics}>
          <article className={styles.metricCard}>
            <span>Scheduled</span>
            <strong>{loading ? "--" : data?.counts.scheduled ?? 0}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Pending Approval</span>
            <strong>{loading ? "--" : data?.counts.pending_approval ?? 0}</strong>
          </article>
        </section>

        {error ? <p className={styles.error}>{error}</p> : null}
        {loading ? <p className={styles.empty}>Loading calendar...</p> : null}

        {!loading && data?.items.length === 0 ? (
          <p className={styles.empty}>No scheduled channel activity has been added yet.</p>
        ) : null}

        {!loading && data?.items.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Channel</th>
                  <th>Platform</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                  <th>Approval</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        href={`/investor-growth/campaigns/${item.campaign_id}`}
                        className={styles.inlineLink}
                      >
                        {item.company_name || item.ticker || "Campaign"}
                      </Link>
                    </td>
                    <td>{item.channel}</td>
                    <td>{item.platform || "-"}</td>
                    <td>{item.scheduled_for || "-"}</td>
                    <td>{item.delivery_status}</td>
                    <td>{item.approval_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </main>
  );
}
