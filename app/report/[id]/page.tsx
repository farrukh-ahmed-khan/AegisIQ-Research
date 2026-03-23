"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export default function ReportPage({ params }) {
  const { user, isLoaded } = useUser();
  const [data, setData] = useState(null);
  const [aiReport, setAiReport] = useState("");
  const [dcf, setDcf] = useState(null);
  const [valuation, setValuation] = useState(null);
  const [rating, setRating] = useState("");
  const [targetRange, setTargetRange] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingAnalyst, setLoadingAnalyst] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [refreshingMarket, setRefreshingMarket] = useState(false);
  const [runningValuation, setRunningValuation] = useState(false);
  const [error, setError] = useState("");

  const id = params.id;

  useEffect(() => {
    if (isLoaded && user?.id) {
      loadReport();
    }
  }, [isLoaded, user?.id]);

  async function loadReport() {
    setError("");
    const res = await fetch(
      `/.netlify/functions/get-report-summary?id=${id}&userId=${encodeURIComponent(user.id)}`
    );
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || "Unable to load report.");
      return;
    }

    setData(json);
    setAiReport(json.savedReport || "");
    setRating(json.request?.analyst_rating || "");
    setTargetRange(json.narrative?.targetRange || null);
  }

  async function refreshMarketData() {
    try {
      setRefreshingMarket(true);
      await fetch("/.netlify/functions/refresh-market-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await loadReport();
    } finally {
      setRefreshingMarket(false);
    }
  }

  async function runValuation() {
    try {
      setRunningValuation(true);
      const res = await fetch(`/.netlify/functions/run-valuation?id=${id}`, {
        method: "GET",
      });
      const json = await res.json();
      setValuation(json.valuation || null);
      setDcf(json.valuation?.dcf || null);
      setRating(json.valuation?.rating || "");
      setTargetRange(json.valuation?.targetRange || null);
      await loadReport();
    } finally {
      setRunningValuation(false);
    }
  }

  async function runAiAnalyst() {
    try {
      setLoadingAnalyst(true);
      const res = await fetch(`/.netlify/functions/run-ai-analyst?id=${id}`, {
        method: "GET",
      });
      const json = await res.json();
      setValuation(json.valuation || null);
      setDcf(json.valuation?.dcf || null);
      setRating(json.valuation?.rating || "");
      setTargetRange(json.valuation?.targetRange || null);
      await loadReport();
    } finally {
      setLoadingAnalyst(false);
    }
  }

  async function generateAIReport() {
    try {
      setLoadingAI(true);
      const res = await fetch(`/.netlify/functions/generate-report?id=${id}`);
      const json = await res.json();
      setAiReport(json.report || "No report generated.");
      setDcf(json.dcf || null);
      setValuation(json.valuation || null);
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

  if (!isLoaded) {
    return <main style={pageStyle}><div style={cardStyle}><h2>Loading...</h2></div></main>;
  }

  if (error) {
    return <main style={pageStyle}><div style={cardStyle}><h2>{error}</h2></div></main>;
  }

  if (!data) {
    return <main style={pageStyle}><div style={cardStyle}><h2>Loading report...</h2></div></main>;
  }

  const { request, analytics, narrative } = data;

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1140, margin: "0 auto", display: "grid", gap: 24 }}>
        <section style={heroStyle}>
          <div style={badgeStyle}>AegisIQ Equity Research</div>
          <h1 style={{ margin: "12px 0 8px 0", fontSize: 42 }}>
            {request.company_name || request.ticker} Research Summary
          </h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.84)", fontSize: 18 }}>
            {request.ticker} · {request.period} · Rows Uploaded: {analytics.rows}
          </p>
        </section>

        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={{ margin: 0 }}>Live Market Snapshot</h2>
            <button onClick={refreshMarketData} style={secondaryButtonStyle}>
              {refreshingMarket ? "Refreshing..." : "Refresh Market Data"}
            </button>
          </div>

          <div style={gridStyle}>
            <Metric label="Company" value={request.company_name || "—"} />
            <Metric label="Live Price" value={formatMoney(request.live_price)} />
            <Metric label="Daily Change" value={formatPercent(request.price_change_pct)} />
            <Metric label="Market Cap" value={formatMoney(request.market_cap)} />
          </div>
        </section>

        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={{ margin: 0 }}>Valuation Engine</h2>
            <button onClick={runValuation} style={primaryButtonStyle}>
              {runningValuation ? "Running..." : "Run Valuation"}
            </button>
          </div>

          <div style={gridStyle}>
            <Metric label="Rating" value={rating || request.analyst_rating || "—"} />
            <Metric label="Low Target" value={formatMoney(targetRange?.low || request.target_low)} />
            <Metric label="Base Target" value={formatMoney(targetRange?.base || request.target_base)} />
            <Metric label="High Target" value={formatMoney(targetRange?.high || request.target_high)} />
          </div>

          {valuation ? (
            <div style={{ marginTop: 18, color: "#24364f", lineHeight: 1.7 }}>
              {valuation.summary}
            </div>
          ) : null}
        </section>

        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={{ margin: 0 }}>AI Analyst Engine</h2>
            <button onClick={runAiAnalyst} style={primaryButtonStyle}>
              {loadingAnalyst ? "Generating..." : "Run AI Analyst Engine"}
            </button>
          </div>

          <div style={{ display: "grid", gap: 20 }}>
            <div>
              <h3 style={subTitleStyle}>Investment Thesis</h3>
              <p style={bodyTextStyle}>{request.ai_thesis || "No AI thesis generated yet."}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <h3 style={subTitleStyle}>Key Risks</h3>
                {request.ai_risks?.length ? (
                  <ul style={listStyle}>
                    {request.ai_risks.map((item, idx) => <li key={idx}>{item}</li>)}
                  </ul>
                ) : (
                  <p style={bodyTextStyle}>No risk set generated yet.</p>
                )}
              </div>

              <div>
                <h3 style={subTitleStyle}>Catalysts</h3>
                {request.ai_catalysts?.length ? (
                  <ul style={listStyle}>
                    {request.ai_catalysts.map((item, idx) => <li key={idx}>{item}</li>)}
                  </ul>
                ) : (
                  <p style={bodyTextStyle}>No catalyst set generated yet.</p>
                )}
              </div>
            </div>

            <div>
              <h3 style={subTitleStyle}>Recommendation Summary</h3>
              <p style={bodyTextStyle}>
                {request.ai_recommendation_summary || "No recommendation summary generated yet."}
              </p>
            </div>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Initial Thesis</h2>
          <p style={bodyTextStyle}>
            {narrative?.thesis || "No thesis available yet."}
          </p>

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

function formatPercent(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)}%`;
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

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  marginBottom: 18
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

const subTitleStyle = {
  marginTop: 0,
  marginBottom: 8,
  color: "#0b1f3b",
  fontSize: 20,
};

const bodyTextStyle = {
  color: "#24364f",
  lineHeight: 1.7,
  margin: 0,
};

const listStyle = {
  color: "#24364f",
  lineHeight: 1.8,
  marginTop: 0,
  paddingLeft: 20,
};
