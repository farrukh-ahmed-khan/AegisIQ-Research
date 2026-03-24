"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./screener.module.css";
import type {
  ScreenerApiResponse,
  ScreenerCoverageMode,
  ScreenerFilterKey,
  ScreenerQueryState,
  ScreenerResultRow,
  SupportedFiltersMap,
} from "@/lib/screener/types";

const SECURITY_MASTER_FILTER_ORDER: ScreenerFilterKey[] = [
  "sector",
  "industry",
  "exchange",
  "country",
  "currency",
  "securityType",
];

const SECURITY_MASTER_FILTER_LABELS: Record<ScreenerFilterKey, string> = {
  sector: "Sector",
  industry: "Industry",
  exchange: "Exchange",
  country: "Country",
  currency: "Currency",
  securityType: "Security Type",
};

const INITIAL_QUERY_STATE: ScreenerQueryState = {
  search: "",
  sector: "",
  industry: "",
  exchange: "",
  country: "",
  currency: "",
  securityType: "",
};

function buildQueryString(
  query: ScreenerQueryState,
  coverageMode: ScreenerCoverageMode | null,
) {
  const params = new URLSearchParams();

  if (query.search.trim()) {
    params.set("search", query.search.trim());
  }

  if (coverageMode === "security_master") {
    for (const key of SECURITY_MASTER_FILTER_ORDER) {
      const value = query[key]?.trim();
      if (value) {
        params.set(key, value);
      }
    }
  }

  return params.toString();
}

function normalizeSupportedFilters(
  filters: Partial<SupportedFiltersMap> | null | undefined,
): SupportedFiltersMap {
  return {
    sector: Array.isArray(filters?.sector) ? filters!.sector : [],
    industry: Array.isArray(filters?.industry) ? filters!.industry : [],
    exchange: Array.isArray(filters?.exchange) ? filters!.exchange : [],
    country: Array.isArray(filters?.country) ? filters!.country : [],
    currency: Array.isArray(filters?.currency) ? filters!.currency : [],
    securityType: Array.isArray(filters?.securityType)
      ? filters!.securityType
      : [],
  };
}

function hasAnySupportedSecurityMasterFilters(
  filters: SupportedFiltersMap,
): boolean {
  return SECURITY_MASTER_FILTER_ORDER.some((key) => filters[key].length > 0);
}

function renderCoverageMessage(
  coverageMode: ScreenerCoverageMode | null,
  coverageCount: number,
  supportedFilters: SupportedFiltersMap,
): string {
  if (coverageMode === "watchlist_fallback") {
    return "Using watchlist fallback coverage. Security-master-only company filters are hidden until internal company coverage is available.";
  }

  if (coverageMode === "security_master" && coverageCount === 0) {
    return "Internal security master mode is active, but there is no stored company coverage yet.";
  }

  if (coverageMode === "security_master") {
    const visibleFilterCount = SECURITY_MASTER_FILTER_ORDER.filter(
      (key) => supportedFilters[key].length > 0,
    ).length;

    if (visibleFilterCount === 0) {
      return `Internal company coverage is active for ${coverageCount} securities, but no filterable company fields are populated yet.`;
    }

    return `Internal company coverage is active for ${coverageCount} securities. Showing ${visibleFilterCount} backed filter${visibleFilterCount === 1 ? "" : "s"}.`;
  }

  return "Loading screener coverage...";
}

function getDisplayName(row: ScreenerResultRow): string {
  return row.companyName ?? row.name ?? "Unnamed Security";
}

export default function ScreenerPage() {
  const [query, setQuery] = useState<ScreenerQueryState>(INITIAL_QUERY_STATE);
  const [data, setData] = useState<ScreenerApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const coverageMode = data?.coverageMode ?? null;
  const coverageCount = data?.coverageCount ?? 0;
  const supportedFilters = useMemo(
    () => normalizeSupportedFilters(data?.supportedFilters),
    [data?.supportedFilters],
  );

  const visibleSecurityMasterFilters = useMemo(() => {
    if (coverageMode !== "security_master") {
      return [];
    }

    return SECURITY_MASTER_FILTER_ORDER.filter(
      (key) => supportedFilters[key].length > 0,
    );
  }, [coverageMode, supportedFilters]);

  const showSecurityMasterFilters =
    coverageMode === "security_master" &&
    hasAnySupportedSecurityMasterFilters(supportedFilters);

  const loadResults = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString(query, coverageMode);
      const response = await fetch(
        `/api/screener${queryString ? `?${queryString}` : ""}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          `Screener request failed with status ${response.status}`,
        );
      }

      const payload = (await response.json()) as ScreenerApiResponse;
      setData({
        ...payload,
        supportedFilters: normalizeSupportedFilters(payload.supportedFilters),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load screener results.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [query, coverageMode]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  const handleSearchChange = (value: string) => {
    setQuery((current) => ({
      ...current,
      search: value,
    }));
  };

  const handleFilterChange = (key: ScreenerFilterKey, value: string) => {
    setQuery((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const clearSecurityMasterFilters = () => {
    setQuery((current) => ({
      ...current,
      sector: "",
      industry: "",
      exchange: "",
      country: "",
      currency: "",
      securityType: "",
    }));
  };

  const hasActiveSecurityMasterFilters = SECURITY_MASTER_FILTER_ORDER.some(
    (key) => query[key].trim().length > 0,
  );

  const rows = data?.results ?? [];
  const total = data?.total ?? rows.length;

  const isNoInternalCoverage =
    coverageMode === "security_master" &&
    coverageCount === 0 &&
    rows.length === 0;

  const isNoMatchesWithCoverage =
    coverageMode === "security_master" &&
    coverageCount > 0 &&
    rows.length === 0;

  return (
    <main className={styles.page}>
      <div className={styles.glowBlue} />
      <div className={styles.glowGold} />

      <div className={styles.container}>
        <div className={styles.hero}>
          <h1 className={styles.title}>Screener</h1>
          <p className={styles.subtitle}>
            Screen internal coverage safely. Security-master-backed filters only
            appear when the stored internal company dataset supports them.
          </p>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelContent}>
            <div className={styles.chipRow}>
              <span className={styles.chip}>
                Coverage Mode: {coverageMode ?? "loading"}
              </span>
              <span className={styles.chip}>
                Coverage Count: {coverageCount}
              </span>
              <span className={styles.chip}>Results: {total}</span>
            </div>
            <p className={styles.panelText}>
              {renderCoverageMessage(
                coverageMode,
                coverageCount,
                supportedFilters,
              )}
            </p>
          </div>
        </div>

        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Search</h2>
            <p className={styles.sectionText}>
              Symbol/name search remains available in both coverage modes.
            </p>
          </div>

          <div className={styles.filterGrid}>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Search</span>
              <input
                value={query.search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Symbol or company name"
                className={styles.fieldControl}
              />
            </label>

            {showSecurityMasterFilters &&
              visibleSecurityMasterFilters.map((key) => (
                <label key={key} className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>
                    {SECURITY_MASTER_FILTER_LABELS[key]}
                  </span>
                  <select
                    value={query[key]}
                    onChange={(event) =>
                      handleFilterChange(key, event.target.value)
                    }
                    className={styles.fieldControl}
                  >
                    <option value="">All</option>
                    {supportedFilters[key].map((option) => (
                      <option key={`${key}-${option}`} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
          </div>

          <div className={styles.actionRow}>
            <button
              type="button"
              onClick={() => void loadResults()}
              className={styles.primaryButton}
            >
              Run Screen
            </button>

            {showSecurityMasterFilters && hasActiveSecurityMasterFilters ? (
              <button
                type="button"
                onClick={clearSecurityMasterFilters}
                className={styles.secondaryButton}
              >
                Clear Company Filters
              </button>
            ) : null}
          </div>
        </section>

        {coverageMode === "watchlist_fallback" ? (
          <div className={styles.warningPanel}>
            <p className={styles.warningText}>
              Watchlist fallback is active. The existing Step 8 symbol/watchlist
              flow remains in place, and security-master-only company filters
              are intentionally hidden.
            </p>
          </div>
        ) : null}

        <section className={styles.panel}>
          <div className={styles.resultsHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Results</h2>
              <p className={styles.sectionText}>
                {isLoading
                  ? "Loading results..."
                  : `${rows.length} row${rows.length === 1 ? "" : "s"} returned`}
              </p>
            </div>
          </div>

          {error ? <div className={styles.errorPanel}>{error}</div> : null}

          {!error && !isLoading && isNoInternalCoverage ? (
            <div className={styles.emptyPanel}>
              <h3 className={styles.emptyTitle}>No internal coverage yet</h3>
              <p className={styles.emptyText}>
                Internal security master mode is enabled, but there are
                currently no stored company rows to screen. The screener cannot
                expose company-backed filters until that internal coverage is
                populated.
              </p>
            </div>
          ) : null}

          {!error && !isLoading && isNoMatchesWithCoverage ? (
            <div className={styles.emptyPanel}>
              <h3 className={styles.emptyTitle}>No rows matched</h3>
              <p className={styles.emptyText}>
                Internal coverage exists, but no securities matched the current
                search/filter combination. Adjust or clear filters and run the
                screen again.
              </p>
            </div>
          ) : null}

          {!error && !isLoading && rows.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead className={styles.tableHead}>
                  <tr>
                    <th className={styles.tableHeaderCell}>Symbol</th>
                    <th className={styles.tableHeaderCell}>Name</th>
                    <th className={styles.tableHeaderCell}>Exchange</th>
                    <th className={styles.tableHeaderCell}>Sector</th>
                    <th className={styles.tableHeaderCell}>Country</th>
                    <th className={styles.tableHeaderCell}>Type</th>
                  </tr>
                </thead>
                <tbody className={styles.tableBody}>
                  {rows.map((row) => (
                    <tr key={row.id ?? row.symbol} className={styles.tableRow}>
                      <td className={styles.symbolCell}>{row.symbol}</td>
                      <td className={styles.bodyCell}>{getDisplayName(row)}</td>
                      <td className={styles.bodyCell}>{row.exchange ?? "—"}</td>
                      <td className={styles.bodyCell}>{row.sector ?? "—"}</td>
                      <td className={styles.bodyCell}>{row.country ?? "—"}</td>
                      <td className={styles.bodyCell}>
                        {row.securityType ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
