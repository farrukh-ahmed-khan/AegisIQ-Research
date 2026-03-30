"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./new-report.module.css";

type ReportRun = {
  id: string;
  symbol: string;
  reportType: string;
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
  errorMessage: string | null;
  pdfUrl: string | null;
};

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase();
}

function isValidSymbol(value: string): boolean {
  return /^[A-Z0-9.\-]{1,12}$/.test(value);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US");
}

function NewReportPageContent() {
  const searchParams = useSearchParams();
  const initialSymbol = useMemo(
    () => normalizeSymbol(searchParams.get("symbol") ?? ""),
    [searchParams],
  );

  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [notes, setNotes] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [reports, setReports] = useState<ReportRun[]>([]);

  const loadHistory = useCallback(async (activeSymbol: string) => {
    if (!isValidSymbol(activeSymbol)) {
      setReports([]);
      return;
    }

    setIsLoadingHistory(true);

    try {
      const response = await fetch(
        `/api/workspaces/${encodeURIComponent(activeSymbol)}/reports`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (response.status === 401) {
        setErrorMessage("Please sign in to view report history.");
        setReports([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load report history (${response.status}).`);
      }

      const payload = (await response.json()) as { reports?: ReportRun[] };
      setReports(Array.isArray(payload.reports) ? payload.reports : []);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load report history.";
      setErrorMessage(message);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (isValidSymbol(initialSymbol)) {
      void loadHistory(initialSymbol);
    }
  }, [initialSymbol, loadHistory]);

  async function generateReport() {
    setErrorMessage("");
    setStatusMessage("");

    const normalized = normalizeSymbol(symbol);

    if (!isValidSymbol(normalized)) {
      setErrorMessage("Enter a valid ticker symbol (example: AAPL).");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch(
        `/api/workspaces/${encodeURIComponent(normalized)}/reports`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportType: "equity_research",
            notes: notes.trim() || null,
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        report?: ReportRun;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to generate report.");
      }

      setStatusMessage("AI report generated successfully.");
      setNotes("");
      await loadHistory(normalized);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate report.";
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.glowBlue} />
      <div className={styles.glowGold} />

      <div className={styles.container}>
        <h1 className={styles.title}>AI Research Report Builder</h1>
        <p className={styles.subtitle}>
          Generate institutional-style analyst reports from stored fundamentals,
          valuation metrics, and the AI analyst pipeline. Exported PDFs are
          attached to each report run.
        </p>

        <section className={styles.panel}>
          <div className={styles.row}>
            <input
              className={styles.input}
              placeholder="Ticker symbol"
              value={symbol}
              onChange={(event) =>
                setSymbol(normalizeSymbol(event.target.value))
              }
            />
            <button
              className={styles.button}
              onClick={() => void generateReport()}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate AI Report"}
            </button>
            <button
              className={styles.secondaryButton}
              onClick={() => void loadHistory(normalizeSymbol(symbol))}
              disabled={isLoadingHistory}
            >
              {isLoadingHistory ? "Refreshing..." : "Refresh History"}
            </button>
            {isValidSymbol(symbol) ? (
              <Link
                href={`/workspace/${encodeURIComponent(normalizeSymbol(symbol))}`}
                className={styles.secondaryButton}
              >
                Open Workspace
              </Link>
            ) : null}
          </div>

          <textarea
            className={styles.textarea}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional analyst notes to include in run input..."
          />

          {statusMessage ? (
            <p className={styles.status}>{statusMessage}</p>
          ) : null}
          {errorMessage ? (
            <p className={`${styles.status} ${styles.error}`}>{errorMessage}</p>
          ) : null}
        </section>

        <section className={styles.panel}>
          <h2 style={{ marginTop: 0, marginBottom: "15px" }}>Report Runs</h2>
          {reports.length === 0 ? (
            <p className={styles.status}>No report runs yet for this symbol.</p>
          ) : (
            <ul className={styles.list}>
              {reports.map((report) => (
                <li key={report.id} className={styles.item}>
                  <div className={styles.itemHeader}>
                    <div>
                      <div className={styles.label}>
                        {report.reportType.replaceAll("_", " ")}
                      </div>
                      <div className={styles.value}>{report.symbol}</div>
                    </div>
                    <div>
                      <div className={styles.label}>Status</div>
                      <div className={styles.value}>{report.status}</div>
                    </div>
                    <div>
                      <div className={styles.label}>Created</div>
                      <div className={styles.value}>
                        {formatDateTime(report.createdAt)}
                      </div>
                    </div>
                  </div>

                  {report.errorMessage ? (
                    <p className={`${styles.status} ${styles.error}`}>
                      {report.errorMessage}
                    </p>
                  ) : null}

                  <div className={styles.inlineLinks}>
                    {report.pdfUrl ? (
                      <a
                        href={report.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.link}
                      >
                        Open PDF
                      </a>
                    ) : null}
                    <Link
                      href={`/workspace/${encodeURIComponent(report.symbol)}`}
                      className={styles.link}
                    >
                      Open Workspace
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

export default function NewReportPage() {
  return (
    <Suspense fallback={<main className={styles.page} />}>
      <NewReportPageContent />
    </Suspense>
  );
}
