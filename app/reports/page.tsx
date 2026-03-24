"use client";

import { useEffect, useState } from "react";
import styles from "./reports.module.css";

export default function PublishedReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    const res = await fetch("/.netlify/functions/list-published-reports");
    const json = await res.json();
    setReports(json.reports || []);
    setLoading(false);
  }

  return (
    <main className={styles.page}>
      <div className={styles.glowBlue} />
      <div className={styles.glowGold} />

      <div className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.badge}>AegisIQ Library</div>
          <h1 className={styles.title}>Published Research Reports</h1>
          <p className={styles.subtitle}>
            Review published research summaries and reopen any report page.
          </p>
        </section>

        <section className={styles.card}>
          {loading ? (
            <p className={styles.infoText}>Loading published reports...</p>
          ) : reports.length === 0 ? (
            <p className={styles.infoText}>No published reports yet.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.tableHeadCell}>ID</th>
                    <th className={styles.tableHeadCell}>Title</th>
                    <th className={styles.tableHeadCell}>Rating</th>
                    <th className={styles.tableHeadCell}>Base Target</th>
                    <th className={styles.tableHeadCell}>Published</th>
                    <th className={styles.tableHeadCell}>PDF</th>
                    <th className={styles.tableHeadCell}>Open</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className={styles.tableRow}>
                      <td className={styles.tableCell}>{report.id}</td>
                      <td className={styles.tableCell}>
                        {report.report_title ||
                          `${report.ticker} Research Report`}
                      </td>
                      <td className={styles.tableCell}>
                        {report.analyst_rating || "—"}
                      </td>
                      <td className={styles.tableCell}>
                        {formatMoney(report.target_base)}
                      </td>
                      <td className={styles.tableCell}>
                        {formatDateTime(report.published_at)}
                      </td>
                      <td className={styles.tableCell}>
                        {report.pdf_generated_at ? "Yes" : "No"}
                      </td>
                      <td className={styles.tableCell}>
                        <a
                          href={`/report/${report.id}`}
                          className={styles.link}
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function formatMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US");
}
