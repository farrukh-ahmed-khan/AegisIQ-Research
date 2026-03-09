"use client";

import { useState } from "react";

export default function HomePage() {
  const [ticker, setTicker] = useState("");
  const [period, setPeriod] = useState("1Y");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("");

    if (!ticker.trim()) {
      setStatus("Please enter a ticker.");
      return;
    }

    if (!file) {
      setStatus("Please upload an Excel file.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("ticker", ticker.toUpperCase().trim());
      formData.append("period", period);
      formData.append("file", file);

      const response = await fetch("/.netlify/functions/create-report-request", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setStatus(`Saved successfully. Request ID: ${data.requestId}`);
      setTicker("");
      setPeriod("1Y");
      setFile(null);

      const fileInput = document.getElementById("excel-file");
      if (fileInput) fileInput.value = "";
    } catch (error) {
      setStatus(error.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #07111f 0%, #0b1f3b 45%, #123d6b 100%)",
        color: "#ffffff",
        padding: "48px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "980px",
          margin: "0 auto",
          display: "grid",
          gap: "28px",
        }}
      >
        <section
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "20px",
            padding: "36px",
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "8px 14px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.1)",
              fontSize: "12px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: "18px",
            }}
          >
            AegisIQ Equity Analysis & Research
          </div>

          <h1
            style={{
              fontSize: "46px",
              lineHeight: 1.05,
              margin: "0 0 14px 0",
            }}
          >
            Generate stock research requests in one clean workflow.
          </h1>

          <p
            style={{
              fontSize: "18px",
              lineHeight: 1.6,
              maxWidth: "760px",
              color: "rgba(255,255,255,0.82)",
              margin: 0,
            }}
          >
            Enter the ticker, upload the investor.com price-history Excel file,
            choose the period, and submit the request for report generation.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: "24px",
          }}
        >
          <div
            style={{
              borderRadius: "20px",
              padding: "28px",
              background: "#ffffff",
              color: "#0b1f3b",
              boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: "28px" }}>New Report Request</h2>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "18px" }}>
              <div>
                <label
                  htmlFor="ticker"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 700,
                  }}
                >
                  Stock ticker
                </label>
                <input
                  id="ticker"
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  placeholder="AAPL"
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  htmlFor="period"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 700,
                  }}
                >
                  History period
                </label>
                <select
                  id="period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  style={inputStyle}
                >
                  <option value="1Y">1 Year</option>
                  <option value="3Y">3 Years</option>
                  <option value="5Y">5 Years</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="excel-file"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 700,
                  }}
                >
                  Investor.com Excel file
                </label>
                <input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={fileInputStyle}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: "6px",
                  padding: "14px 18px",
                  fontSize: "16px",
                  fontWeight: 700,
                  background: submitting ? "#7f8aa3" : "#0b3d91",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Submitting..." : "Generate Report Request"}
              </button>
            </form>

            {status ? (
              <div
                style={{
                  marginTop: "18px",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "#edf4ff",
                  color: "#103a71",
                  fontWeight: 600,
                }}
              >
                {status}
              </div>
            ) : null}
          </div>

          <div
            style={{
              borderRadius: "20px",
              padding: "28px",
              background: "rgba(255,255,255,0.08)",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: "24px" }}>What this step does</h3>

            <div style={{ display: "grid", gap: "14px", lineHeight: 1.6 }}>
              <div>
                <strong>1.</strong> Captures the stock ticker.
              </div>
              <div>
                <strong>2.</strong> Uploads the Excel history file.
              </div>
              <div>
                <strong>3.</strong> Labels the dataset as 1Y, 3Y, or 5Y.
              </div>
              <div>
                <strong>4.</strong> Sends the request to a Netlify Function.
              </div>
              <div>
                <strong>5.</strong> Stores the submission for the next build phase.
              </div>
            </div>

            <div
              style={{
                marginTop: "24px",
                padding: "16px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.08)",
                fontSize: "14px",
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.86)",
              }}
            >
              This does not generate the final report yet. It creates the first
              working intake screen for AegisIQ.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px 14px",
  borderRadius: "12px",
  border: "1px solid #c9d4e5",
  fontSize: "16px",
  boxSizing: "border-box",
};

const fileInputStyle = {
  ...inputStyle,
  padding: "12px",
  background: "#ffffff",
};