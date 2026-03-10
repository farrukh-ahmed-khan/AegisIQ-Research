"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

function buildQueryString(query: ScreenerQueryState, coverageMode: ScreenerCoverageMode | null) {
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
    securityType: Array.isArray(filters?.securityType) ? filters!.securityType : [],
  };
}

function hasAnySupportedSecurityMasterFilters(filters: SupportedFiltersMap): boolean {
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

    return SECURITY_MASTER_FILTER_ORDER.filter((key) => supportedFilters[key].length > 0);
  }, [coverageMode, supportedFilters]);

  const showSecurityMasterFilters =
    coverageMode === "security_master" && hasAnySupportedSecurityMasterFilters(supportedFilters);

  const loadResults = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString(query, coverageMode);
      const response = await fetch(`/api/screener${queryString ? `?${queryString}` : ""}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Screener request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as ScreenerApiResponse;
      setData({
        ...payload,
        supportedFilters: normalizeSupportedFilters(payload.supportedFilters),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load screener results.";
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
    coverageMode === "security_master" && coverageCount === 0 && rows.length === 0;

  const isNoMatchesWithCoverage =
    coverageMode === "security_master" && coverageCount > 0 && rows.length === 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Screener</h1>
          <p className="max-w-3xl text-sm text-slate-300">
            Screen internal coverage safely. Security-master-backed filters only appear when the
            stored internal company dataset supports them.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-slate-300">
                Coverage Mode: {coverageMode ?? "loading"}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-300">
                Coverage Count: {coverageCount}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-300">
                Results: {total}
              </span>
            </div>
            <p className="text-sm text-slate-300">
              {renderCoverageMessage(coverageMode, coverageCount, supportedFilters)}
            </p>
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex flex-col gap-2">
            <h2 className="text-lg font-medium text-white">Search</h2>
            <p className="text-sm text-slate-400">
              Symbol/name search remains available in both coverage modes.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-300">Search</span>
              <input
                value={query.search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Symbol or company name"
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-slate-500"
              />
            </label>

            {showSecurityMasterFilters &&
              visibleSecurityMasterFilters.map((key) => (
                <label key={key} className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-300">
                    {SECURITY_MASTER_FILTER_LABELS[key]}
                  </span>
                  <select
                    value={query[key]}
                    onChange={(event) => handleFilterChange(key, event.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-0"
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

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadResults()}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
            >
              Run Screen
            </button>

            {showSecurityMasterFilters && hasActiveSecurityMasterFilters ? (
              <button
                type="button"
                onClick={clearSecurityMasterFilters}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Clear Company Filters
              </button>
            ) : null}
          </div>
        </section>

        {coverageMode === "watchlist_fallback" ? (
          <div className="mb-6 rounded-2xl border border-amber-700/40 bg-amber-950/30 p-4">
            <p className="text-sm text-amber-200">
              Watchlist fallback is active. The existing Step 8 symbol/watchlist flow remains in
              place, and security-master-only company filters are intentionally hidden.
            </p>
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-white">Results</h2>
              <p className="text-sm text-slate-400">
                {isLoading ? "Loading results..." : `${rows.length} row${rows.length === 1 ? "" : "s"} returned`}
              </p>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-800/50 bg-red-950/40 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {!error && !isLoading && isNoInternalCoverage ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
              <h3 className="mb-2 text-base font-medium text-white">No internal coverage yet</h3>
              <p className="text-sm text-slate-400">
                Internal security master mode is enabled, but there are currently no stored company
                rows to screen. The screener cannot expose company-backed filters until that
                internal coverage is populated.
              </p>
            </div>
          ) : null}

          {!error && !isLoading && isNoMatchesWithCoverage ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
              <h3 className="mb-2 text-base font-medium text-white">No rows matched</h3>
              <p className="text-sm text-slate-400">
                Internal coverage exists, but no securities matched the current search/filter
                combination. Adjust or clear filters and run the screen again.
              </p>
            </div>
          ) : null}

          {!error && !isLoading && rows.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-950">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Symbol
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Exchange
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Sector
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Country
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900">
                  {rows.map((row) => (
                    <tr key={row.id ?? row.symbol}>
                      <td className="px-4 py-3 text-sm font-medium text-white">{row.symbol}</td>
                      <td className="px-4 py-3 text-sm text-slate-200">{getDisplayName(row)}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{row.exchange ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{row.sector ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{row.country ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">
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
