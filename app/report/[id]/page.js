"use client";

import { useEffect, useState } from "react";

export default function ReportPage({ params }) {
  const [data, setData] = useState(null);
  const [aiReport, setAiReport] = useState("");
  const [dcf, setDcf] = useState(null);
  const [comps, setComps] = useState(null);
  const [rating, setRating] = useState("");
  const [targetRange, setTargetRange] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const id = params.id;

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    const res = await fetch(`/.netlify/functions/get-report-summary?id=${id}`);
    const json = await res.json();
    setData(json);
    setAiReport(json.savedReport || "");
    setRating(json.request?.analyst_rating || "");
    setTargetRange(json.narrative?.targetRange || null);
  }

  async function generateAIReport() {
    try {
      setLoadingAI(true);
      const res = await fetch(`/.netlify/functions/generate-report?id=${id}`);
      const json = await res.json();
      setAiReport(json.report || "No report generated.");
      setDcf(json.dcf || null);
      setComps(json.comps || null);
      setRating(json.rating || "");
      setTargetRange(json.targetRange || null);
      await loadReport();
    } finally {
      setLoadingAI(false);
    }
  }

  async function downloadPDF() {
    try {
      setLoadingPDF(true);
      window.open(`/.netlify/functions/export-report-pdf?id=${id}`, "_blank");
      setTimeout(loadReport, 1500);
    } finally {
      setLoadingPDF(false);
    }
  }

  async function publishReport() {
    try {
      setPublishing(true);
      await fetch("/.netlify/functions/publish-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await loadReport();
    } finally {
      setPublishing(false);
    }
  }

  if (!data) {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <h2>Loading report...</h2>
        </div>
      </main>
    );
  }

  const { request, analytics, narrative, exports } = data;

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1140, margin: "0 auto", display: "grid", gap: 24 }}>
        <section style={heroStyle}>
          <div style={badgeStyle}>AegisIQ Equity Research</div>
          <h1 style={{ margin: "12px 0 8px 0", fontSize: 42 }}>
            {request.ticker} Research Summary
          </h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.84)", fontSize: 18 }}>
            Period: {request.period} · Rows Uploaded: {analytics.rows}
          </p>
        </section>

        <section style={gridStyle}>
          <Metric label="First Close" value={formatMoney(analytics.firstClose)} />
          <Metric label="Last Close" value={formatMoney(analytics.lastClose)} />
          <Metric label="Return %" value={formatPercent(analytics.percentChange)} />
          <Metric label="Volatility" value={formatPercent(analytics.volatilityAnnualized)} />
        </section>

        <section style={gridStyle}>
          <Metric label="SMA 20" value={formatMoney(analytics.sma20)} />
          <Metric label="SMA 50" value={formatMoney(analytics.sma50)} />
          <Metric label="Highest High" value={formatMoney(analytics.highMax)} />
          <Metric label="Lowest Low" value={formatMoney(analytics.lowMin)} />
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Initial Thesis</h2>
          <p style={{ lineHeight: 1.7, color: "#24364f" }}>
            {narrative?.thesis || "No thesis available yet."}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 18 }}>
            <Metric label="Low Case" value={formatMoney(targetRange?.low)} />
            <Metric label="Base Case" value={formatMoney(targetRange?.base)} />
            <Metric label="High Case" value={formatMoney(targetRange?.high)} />
          </div>

          <div style={{ display: "flex", gap: 14, marginTop: 24, flexWrap: "wrap" }}>
            <button onClick={generateAIReport} style={primaryButtonStyle}>
              {loadingAI ? "Generating..." : "Generate AI Research Report"}
            </button>

            <button onClick={downloadPDF} style={secondaryButtonStyle}>
              {loadingPDF ? "Preparing PDF..." : "Download PDF Report"}
            </button>

            <button onClick={publishReport} style={publishButtonStyle}>
              {publishing ? "Publishing..." : "Publish Report"}
            </button>

            <a href="/dashboard" style={dashboardLinkStyle}>Dashboard</a>
            <a href="/reports" style={dashboardLinkStyle}>Published Reports</a>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Report Metadata</h2>
          <div style={{ display: "grid", gap: 8, color: "#24364f", lineHeight: 1.7 }}>
            <div><strong>Status:</strong> {request.status}</div>
            <div><strong>Rating:</strong> {rating || request.analyst_rating || "—"}</div>
            <div><strong>Title:</strong> {request.report_title || "—"}</div>
            <div><strong>Published:</strong> {formatDateTime(request.published_at)}</div>
            <div><strong>Last PDF Export:</strong> {formatDateTime(request.pdf_generated_at)}</div>
          </div>
        </section>

        {exports?.length ? (
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Export History</h2>
            <div style={{ display: "grid", gap: 10 }}>
              {exports.map((item) => (
                <div key={item.id} style={exportRowStyle}>
                  <div><strong>{item.export_type.toUpperCase()}</strong></div>
                  <div>{item.file_name || "—"}</div>
                  <div>{formatDateTime(item.created_at)}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {dcf ? (
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>DCF Snapshot</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              <Metric label="Enterprise Value" value={formatMoney(dcf.enterpriseValue)} />
              <Metric label="Implied Value / Share" value={formatMoney(dcf.impliedValuePerShare)} />
              <Metric label="Growth Rate" value={formatPercent((dcf.assumptions?.growthRate || 0) * 100)} />
              <Metric label="Discount Rate" value={formatPercent((dcf.assumptions?.discountRate || 0) * 100)} />
            </div>
          </section>
        ) : null}

        {comps?.comps?.length ? (
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Comparable Companies</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Company</th>
                    <th>Market Cap</th>
                    <th>EV/Revenue</th>
                    <th>EV/EBITDA</th>
                    <th>P/E</th>
                  </tr>
                </thead>
                <tbody>
                  {comps.comps.map((comp) => (
                    <tr key={comp.ticker}>
                      <td>{comp.ticker}</td>
                      <td>{comp.company_name}</td>
                      <td>{formatMoney(comp.market_cap)}</td>
                      <td>{formatNumber(comp.ev_revenue)}</td>
                      <td>{formatNumber(comp.ev_ebitda)}</td>
                      <td>{formatNumber(comp.pe_ratio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>AI Equity Research Report</h2>
          {!aiReport ? (
            <p style={{ color: "#5d6b82" }}>
              Generate the AI research report to display the narrative here.
            </p>
          ) : (
            <div style={reportBoxStyle}>
              <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, margin: 0 }}>
                {aiReport}
              </pre>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <div style={metricCardStyle}>
      <div style={{ fontSize: 12, color: "#6b7a90", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function formatMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(n);
}

function formatNumber(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(2);
}

function formatPercent(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)}%`;
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
  background: "linear-gradient(135deg,#07111f,#0b1f3b,#123d6b)"
};

const heroStyle = {
  color: "white",
  padding: 30,
  borderRadius: 20,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)"
};

const badgeStyle = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.12)",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.08em"
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4,1fr)",
  gap: 16
};

const cardStyle = {
  background: "white",
  padding: 28,
  borderRadius: 18,
  boxShadow: "0 18px 50px rgba(0,0,0,0.18)"
};

const metricCardStyle = {
  background: "white",
  padding: 20,
  borderRadius: 16,
  boxShadow: "0 18px 50px rgba(0,0,0,0.18)"
};

const primaryButtonStyle = {
  padding: "12px 18px",
  fontSize: 16,
  background: "#0b3d91",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer"
};

const secondaryButtonStyle = {
  padding: "12px 18px",
  fontSize: 16,
  background: "#ffffff",
  color: "#0b3d91",
  border: "1px solid #0b3d91",
  borderRadius: 8,
  cursor: "pointer"
};

const publishButtonStyle = {
  padding: "12px 18px",
  fontSize: 16,
  background: "#14804A",
  color: "#ffffff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer"
};

const dashboardLinkStyle = {
  padding: "12px 18px",
  fontSize: 16,
  background: "#eef4ff",
  color: "#0b3d91",
  border: "1px solid #cfe0ff",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: 700
};

const reportBoxStyle = {
  marginTop: 10,
  padding: 20,
  background: "#f6f8fb",
  borderRadius: 10
};

const exportRowStyle = {
  display: "grid",
  gridTemplateColumns: "120px 1fr 220px",
  gap: 16,
  padding: "12px 14px",
  borderRadius: 10,
  background: "#f8fbff"
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};
