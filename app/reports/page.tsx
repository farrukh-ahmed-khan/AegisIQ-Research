"use client";

import { useEffect, useState } from "react";

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
    <main style={pageStyle}>
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gap: 24 }}>
        <section style={heroStyle}>
          <div style={badgeStyle}>AegisIQ Library</div>
          <h1 style={{ margin: "12px 0 8px 0", fontSize: 42 }}>
            Published Research Reports
          </h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.84)", fontSize: 18 }}>
            Review published research summaries and reopen any report page.
          </p>
        </section>

        <section style={cardStyle}>
          {loading ? (
            <p>Loading published reports...</p>
          ) : reports.length === 0 ? (
            <p>No published reports yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Rating</th>
                    <th>Base Target</th>
                    <th>Published</th>
                    <th>PDF</th>
                    <th>Open</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td>{report.id}</td>
                      <td>{report.report_title || `${report.ticker} Research Report`}</td>
                      <td>{report.analyst_rating || "—"}</td>
                      <td>{formatMoney(report.target_base)}</td>
                      <td>{formatDateTime(report.published_at)}</td>
                      <td>{report.pdf_generated_at ? "Yes" : "No"}</td>
                      <td>
                        <a href={`/report/${report.id}`} style={linkStyle}>
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

const pageStyle = {
  minHeight: "100vh",
  padding: 40,
  background: "linear-gradient(135deg,#07111f,#0b1f3b,#123d6b)",
};

const heroStyle = {
  color: "white",
  padding: 30,
  borderRadius: 20,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
};

const badgeStyle = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.12)",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const cardStyle = {
  background: "white",
  padding: 28,
  borderRadius: 18,
  boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const linkStyle = {
  color: "#0b3d91",
  fontWeight: 700,
  textDecoration: "none",
};
