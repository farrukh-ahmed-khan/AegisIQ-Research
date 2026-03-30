"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Table,
  Input,
  Select,
  Button,
  Tag,
  Space,
  ConfigProvider,
  theme,
  Checkbox,
  InputNumber,
  Divider,
  message,
} from "antd";
import type {
  ColumnsType,
  TablePaginationConfig,
  TableProps,
} from "antd/es/table";
import styles from "./screener.module.css";
import type {
  MarketCapBucket,
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
  "primaryExchange",
  "region",
  "isActive",
  "country",
  "currency",
  "securityType",
];

const SECURITY_MASTER_FILTER_LABELS: Record<ScreenerFilterKey, string> = {
  sector: "Sector",
  industry: "Industry",
  exchange: "Exchange",
  primaryExchange: "Primary Exchange",
  region: "Region",
  isActive: "Active Status",
  country: "Country",
  currency: "Currency",
  securityType: "Security Type",
};

const MARKET_CAP_BUCKET_OPTIONS: { label: string; value: MarketCapBucket }[] = [
  { label: "Nano (<$50M)", value: "nano" },
  { label: "Micro ($50M–$300M)", value: "micro" },
  { label: "Small ($300M–$2B)", value: "small" },
  { label: "Mid ($2B–$10B)", value: "mid" },
  { label: "Large ($10B–$200B)", value: "large" },
  { label: "Mega (>$200B)", value: "mega" },
];

const DEFAULT_PAGE_SIZE = 50;
const EMPTY_ROWS: ScreenerResultRow[] = [];

const INITIAL_QUERY_STATE: ScreenerQueryState = {
  search: "",
  sector: "",
  industry: "",
  exchange: "",
  primaryExchange: "",
  region: "",
  isActive: "",
  country: "",
  currency: "",
  securityType: "",
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  marketCapBuckets: [],
  peRatioMin: "",
  peRatioMax: "",
  evToEbitdaMin: "",
  evToEbitdaMax: "",
  priceToBookMin: "",
  priceToBookMax: "",
  priceToSalesMin: "",
  priceToSalesMax: "",
  revenueGrowthMin: "",
  earningsGrowthMin: "",
  fcfGrowthMin: "",
};

const DEFAULT_SCREENER_WORKSPACE_ID = "global_screener";

interface WatchlistOption {
  id: string;
  name: string;
  isDefault: boolean;
}

type ActionStatus = "idle" | "running";

function buildApiFilters(
  activeQuery: ScreenerQueryState,
  coverageMode: ScreenerCoverageMode | null,
): Record<string, unknown> {
  const filters: Record<string, unknown> = {};

  if (activeQuery.search.trim()) {
    filters.search = activeQuery.search.trim();
  }

  if (coverageMode === "security_master") {
    for (const key of SECURITY_MASTER_FILTER_ORDER) {
      const value = activeQuery[key]?.trim();
      if (value) filters[key] = value;
    }
  }

  if (activeQuery.marketCapBuckets.length > 0) {
    filters.marketCapBucket = activeQuery.marketCapBuckets;
  }

  const parseOptionalNumber = (value: string): number | undefined => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const peRatioMin = parseOptionalNumber(activeQuery.peRatioMin);
  const peRatioMax = parseOptionalNumber(activeQuery.peRatioMax);
  const evToEbitdaMin = parseOptionalNumber(activeQuery.evToEbitdaMin);
  const evToEbitdaMax = parseOptionalNumber(activeQuery.evToEbitdaMax);
  const priceToBookMin = parseOptionalNumber(activeQuery.priceToBookMin);
  const priceToBookMax = parseOptionalNumber(activeQuery.priceToBookMax);
  const priceToSalesMin = parseOptionalNumber(activeQuery.priceToSalesMin);
  const priceToSalesMax = parseOptionalNumber(activeQuery.priceToSalesMax);
  const revenueGrowthMin = parseOptionalNumber(activeQuery.revenueGrowthMin);
  const earningsGrowthMin = parseOptionalNumber(activeQuery.earningsGrowthMin);
  const fcfGrowthMin = parseOptionalNumber(activeQuery.fcfGrowthMin);

  if (peRatioMin !== undefined) filters.peRatioMin = peRatioMin;
  if (peRatioMax !== undefined) filters.peRatioMax = peRatioMax;
  if (evToEbitdaMin !== undefined) filters.evToEbitdaMin = evToEbitdaMin;
  if (evToEbitdaMax !== undefined) filters.evToEbitdaMax = evToEbitdaMax;
  if (priceToBookMin !== undefined) filters.priceToBookMin = priceToBookMin;
  if (priceToBookMax !== undefined) filters.priceToBookMax = priceToBookMax;
  if (priceToSalesMin !== undefined) filters.priceToSalesMin = priceToSalesMin;
  if (priceToSalesMax !== undefined) filters.priceToSalesMax = priceToSalesMax;
  if (revenueGrowthMin !== undefined)
    filters.revenueGrowthMin = revenueGrowthMin;
  if (earningsGrowthMin !== undefined)
    filters.earningsGrowthMin = earningsGrowthMin;
  if (fcfGrowthMin !== undefined) filters.fcfGrowthMin = fcfGrowthMin;

  return filters;
}

function normalizeSupportedFilters(
  filters: Partial<SupportedFiltersMap> | null | undefined,
): SupportedFiltersMap {
  return {
    sector: Array.isArray(filters?.sector) ? filters!.sector : [],
    industry: Array.isArray(filters?.industry) ? filters!.industry : [],
    exchange: Array.isArray(filters?.exchange) ? filters!.exchange : [],
    primaryExchange: Array.isArray(filters?.primaryExchange)
      ? filters!.primaryExchange
      : [],
    region: Array.isArray(filters?.region) ? filters!.region : [],
    isActive: Array.isArray(filters?.isActive) ? filters!.isActive : [],
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

function fmtMarketCap(v: number | null | undefined): string {
  if (v == null) return "—";
  const n = Number(v);
  if (!isFinite(n)) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtMultiple(v: number | null | undefined): string {
  if (v == null) return "—";
  const n = Number(v);
  if (!isFinite(n)) return "—";
  return `${n.toFixed(1)}×`;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  const n = Number(v);
  if (!isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

const TABLE_COLUMNS: ColumnsType<ScreenerResultRow> = [
  {
    title: "Symbol",
    dataIndex: "symbol",
    key: "symbol",
    width: 100,
    fixed: "left",
    render: (val: string) => (
      <span
        style={{ fontWeight: 600, color: "#faad14", fontFamily: "monospace" }}
      >
        {val}
      </span>
    ),
    sorter: (a, b) => a.symbol.localeCompare(b.symbol),
  },
  {
    title: "Name",
    key: "name",
    ellipsis: true,
    render: (_: unknown, row: ScreenerResultRow) =>
      row.companyName ?? row.name ?? "—",
  },
  {
    title: "Sector",
    dataIndex: "sector",
    key: "sector",
    ellipsis: true,
    render: (val: string | null) => val ?? "—",
  },
  {
    title: "Exchange",
    dataIndex: "exchange",
    key: "exchange",
    width: 90,
    render: (val: string | null) => val ?? "—",
  },
  {
    title: "Region",
    dataIndex: "region",
    key: "region",
    width: 90,
    render: (val: string | null) => val ?? "—",
  },
  {
    title: "Mkt Cap",
    dataIndex: "marketCap",
    key: "marketCap",
    width: 100,
    sorter: (a, b) => Number(a.marketCap ?? 0) - Number(b.marketCap ?? 0),
    render: (val: number | null) => (
      <span style={{ color: "#94a3b8" }}>{fmtMarketCap(val)}</span>
    ),
  },
  {
    title: "P/E",
    dataIndex: "peRatio",
    key: "peRatio",
    width: 80,
    sorter: (a, b) => Number(a.peRatio ?? 0) - Number(b.peRatio ?? 0),
    render: (val: number | null) => (
      <span style={{ color: "#94a3b8" }}>{fmtMultiple(val)}</span>
    ),
  },
  {
    title: "EV/EBITDA",
    dataIndex: "evToEbitda",
    key: "evToEbitda",
    width: 100,
    sorter: (a, b) => Number(a.evToEbitda ?? 0) - Number(b.evToEbitda ?? 0),
    render: (val: number | null) => (
      <span style={{ color: "#94a3b8" }}>{fmtMultiple(val)}</span>
    ),
  },
  {
    title: "P/B",
    dataIndex: "priceToBook",
    key: "priceToBook",
    width: 75,
    sorter: (a, b) => Number(a.priceToBook ?? 0) - Number(b.priceToBook ?? 0),
    render: (val: number | null) => (
      <span style={{ color: "#94a3b8" }}>{fmtMultiple(val)}</span>
    ),
  },
  {
    title: "P/S",
    dataIndex: "priceToSales",
    key: "priceToSales",
    width: 75,
    sorter: (a, b) => Number(a.priceToSales ?? 0) - Number(b.priceToSales ?? 0),
    render: (val: number | null) => (
      <span style={{ color: "#94a3b8" }}>{fmtMultiple(val)}</span>
    ),
  },
  {
    title: "Rev Growth",
    dataIndex: "revenueGrowthYoy",
    key: "revenueGrowthYoy",
    width: 100,
    sorter: (a, b) =>
      Number(a.revenueGrowthYoy ?? -Infinity) -
      Number(b.revenueGrowthYoy ?? -Infinity),
    render: (val: number | null) => {
      if (val == null) return <span style={{ color: "#94a3b8" }}>—</span>;
      const color = val >= 0 ? "#52c41a" : "#ff4d4f";
      return <span style={{ color }}>{fmtPct(val)}</span>;
    },
  },
  {
    title: "Earn Growth",
    dataIndex: "earningsGrowthYoy",
    key: "earningsGrowthYoy",
    width: 110,
    sorter: (a, b) =>
      Number(a.earningsGrowthYoy ?? -Infinity) -
      Number(b.earningsGrowthYoy ?? -Infinity),
    render: (val: number | null) => {
      if (val == null) return <span style={{ color: "#94a3b8" }}>—</span>;
      const color = val >= 0 ? "#52c41a" : "#ff4d4f";
      return <span style={{ color }}>{fmtPct(val)}</span>;
    },
  },
  {
    title: "Country",
    dataIndex: "country",
    key: "country",
    width: 85,
    render: (val: string | null) => val ?? "—",
  },
  {
    title: "Type",
    dataIndex: "securityType",
    key: "securityType",
    width: 90,
    render: (val: string | null) => (val ? <Tag color="blue">{val}</Tag> : "—"),
  },
  {
    title: "Status",
    dataIndex: "isActive",
    key: "isActive",
    width: 85,
    render: (val: boolean | null | undefined) =>
      val === false ? (
        <Tag color="red">Inactive</Tag>
      ) : (
        <Tag color="green">Active</Tag>
      ),
  },
];

export default function ScreenerPage() {
  const [query, setQuery] = useState<ScreenerQueryState>(INITIAL_QUERY_STATE);
  const [data, setData] = useState<ScreenerApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [watchlists, setWatchlists] = useState<WatchlistOption[]>([]);
  const [watchlistsLoading, setWatchlistsLoading] = useState<boolean>(false);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>("");
  const [selectionActionStatus, setSelectionActionStatus] =
    useState<ActionStatus>("idle");
  const [selectionNote, setSelectionNote] = useState<string | null>(null);
  const [messageApi, messageContext] = message.useMessage();

  const coverageMode = data?.coverageMode ?? null;
  const coverageCount = data?.coverageCount ?? 0;
  const supportedFilters = useMemo(
    () => normalizeSupportedFilters(data?.supportedFilters),
    [data?.supportedFilters],
  );

  const visibleSecurityMasterFilters = useMemo(() => {
    if (coverageMode !== "security_master") return [];
    return SECURITY_MASTER_FILTER_ORDER.filter(
      (key) => supportedFilters[key].length > 0,
    );
  }, [coverageMode, supportedFilters]);

  const showSecurityMasterFilters =
    coverageMode === "security_master" &&
    hasAnySupportedSecurityMasterFilters(supportedFilters);

  const loadResults = useCallback(
    async (overrideQuery?: Partial<ScreenerQueryState>) => {
      setIsLoading(true);
      setError(null);

      const activeQuery = overrideQuery
        ? { ...query, ...overrideQuery }
        : query;

      try {
        const filters = buildApiFilters(activeQuery, coverageMode);

        const response = await fetch("/api/screener/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            workspaceId: DEFAULT_SCREENER_WORKSPACE_ID,
            filters,
            page: activeQuery.page,
            pageSize: activeQuery.pageSize,
          }),
        });

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
          err instanceof Error
            ? err.message
            : "Failed to load screener results.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [query, coverageMode],
  );

  const loadWatchlists = useCallback(async () => {
    setWatchlistsLoading(true);

    try {
      const response = await fetch("/api/workspaces/watchlists", {
        method: "GET",
        cache: "no-store",
      });

      if (response.status === 401) {
        setWatchlists([]);
        return;
      }

      if (!response.ok) {
        throw new Error(
          `Watchlist request failed with status ${response.status}`,
        );
      }

      const payload = (await response.json()) as {
        watchlists?: WatchlistOption[];
      };
      const nextWatchlists = Array.isArray(payload.watchlists)
        ? payload.watchlists
        : [];

      setWatchlists(nextWatchlists);
      setActiveWatchlistId((current) => {
        if (
          current &&
          nextWatchlists.some((watchlist) => watchlist.id === current)
        ) {
          return current;
        }

        return (
          nextWatchlists.find((watchlist) => watchlist.isDefault)?.id ?? ""
        );
      });
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : "Failed to load watchlists.";
      setSelectionNote(messageText);
    } finally {
      setWatchlistsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadWatchlists();
  }, [loadWatchlists]);

  const handleSearchChange = (value: string) => {
    setQuery((current) => ({ ...current, search: value, page: 1 }));
  };

  const handleFilterChange = (key: ScreenerFilterKey, value: string) => {
    setQuery((current) => ({ ...current, [key]: value, page: 1 }));
  };

  const handleNumericChange = (
    field: keyof ScreenerQueryState,
    value: number | null,
  ) => {
    setQuery((current) => ({
      ...current,
      [field]: value !== null && isFinite(value) ? String(value) : "",
      page: 1,
    }));
  };

  const clearAllFilters = () => {
    setQuery({ ...INITIAL_QUERY_STATE });
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    const newPage = pagination.current ?? 1;
    const newPageSize = pagination.pageSize ?? DEFAULT_PAGE_SIZE;
    const updated = { ...query, page: newPage, pageSize: newPageSize };
    setQuery(updated);
    void loadResults(updated);
  };

  const handleRunScreen = () => {
    const reset = { ...query, page: 1 };
    setQuery(reset);
    void loadResults(reset);
  };

  const hasActiveSecurityMasterFilters = SECURITY_MASTER_FILTER_ORDER.some(
    (key) => query[key].trim().length > 0,
  );

  const hasActiveAdvancedFilters =
    query.marketCapBuckets.length > 0 ||
    query.peRatioMin !== "" ||
    query.peRatioMax !== "" ||
    query.evToEbitdaMin !== "" ||
    query.evToEbitdaMax !== "" ||
    query.priceToBookMin !== "" ||
    query.priceToBookMax !== "" ||
    query.priceToSalesMin !== "" ||
    query.priceToSalesMax !== "" ||
    query.revenueGrowthMin !== "" ||
    query.earningsGrowthMin !== "" ||
    query.fcfGrowthMin !== "";

  const hasAnyActiveFilters =
    query.search.trim().length > 0 ||
    hasActiveSecurityMasterFilters ||
    hasActiveAdvancedFilters;

  const rows = useMemo(() => data?.results ?? EMPTY_ROWS, [data?.results]);
  const total = data?.total ?? 0;
  const currentPage = data?.page ?? query.page;
  const currentPageSize = data?.pageSize ?? query.pageSize;

  const isNoInternalCoverage =
    coverageMode === "security_master" &&
    coverageCount === 0 &&
    rows.length === 0;

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedSymbols.includes(row.symbol)),
    [rows, selectedSymbols],
  );

  useEffect(() => {
    setSelectedSymbols((current) => {
      const next = current.filter((symbol) =>
        rows.some((row) => row.symbol === symbol),
      );

      if (
        next.length === current.length &&
        next.every((symbol, index) => symbol === current[index])
      ) {
        return current;
      }

      return next;
    });
  }, [rows]);

  const rowSelection: TableProps<ScreenerResultRow>["rowSelection"] = {
    selectedRowKeys: selectedSymbols,
    onChange: (nextKeys) => {
      setSelectedSymbols(
        nextKeys
          .map((key) => String(key))
          .filter((symbol, index, arr) => arr.indexOf(symbol) === index),
      );
      setSelectionNote(null);
    },
    preserveSelectedRowKeys: true,
  };

  const saveSelectionSnapshot = useCallback(
    async (linkedWatchlistId?: string) => {
      if (!coverageMode) {
        setSelectionNote(
          "Run the screener before saving a selection snapshot.",
        );
        return false;
      }

      if (selectedRows.length === 0) {
        setSelectionNote("Select at least one security to save a snapshot.");
        return false;
      }

      setSelectionActionStatus("running");
      setSelectionNote(null);

      try {
        const now = new Date();
        const response = await fetch("/api/workspaces/screener/selections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: DEFAULT_SCREENER_WORKSPACE_ID,
            name: `Selection ${now.toISOString()}`,
            coverageMode,
            filters: buildApiFilters(query, coverageMode),
            totalMatches: total,
            resultCount: rows.length,
            linkedWatchlistId: linkedWatchlistId ?? null,
            metadata: {
              selectedSymbols,
              selectedAt: now.toISOString(),
            },
            items: selectedRows.map((row) => ({
              symbol: row.symbol,
              companyName: row.companyName ?? row.name ?? null,
              exchange: row.exchange ?? null,
              sector: row.sector ?? null,
              industry: row.industry ?? null,
              region: row.region ?? null,
              country: row.country ?? null,
              currency: row.currency ?? null,
              securityType: row.securityType ?? null,
              marketCap: row.marketCap ?? null,
              peRatio: row.peRatio ?? null,
              evToEbitda: row.evToEbitda ?? null,
              priceToBook: row.priceToBook ?? null,
              priceToSales: row.priceToSales ?? null,
              revenueGrowthYoy: row.revenueGrowthYoy ?? null,
              earningsGrowthYoy: row.earningsGrowthYoy ?? null,
              fcfGrowthYoy: row.fcfGrowthYoy ?? null,
              metadata: {
                screenerRowId: row.id ?? null,
              },
            })),
          }),
        });

        if (response.status === 401) {
          setSelectionNote("Sign in to save and track screener selections.");
          return false;
        }

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(
            payload?.error ?? "Failed to save selection snapshot.",
          );
        }

        setSelectionNote(
          `Saved selection snapshot for ${selectedRows.length} symbol${selectedRows.length === 1 ? "" : "s"}.`,
        );
        return true;
      } catch (err) {
        const messageText =
          err instanceof Error
            ? err.message
            : "Failed to save selection snapshot.";
        setSelectionNote(messageText);
        return false;
      } finally {
        setSelectionActionStatus("idle");
      }
    },
    [coverageMode, query, rows.length, selectedRows, selectedSymbols, total],
  );

  const addSelectedToWatchlist = useCallback(async () => {
    if (!activeWatchlistId) {
      setSelectionNote("Choose a watchlist before adding selected symbols.");
      return;
    }

    if (selectedRows.length === 0) {
      setSelectionNote(
        "Select at least one security before adding to a watchlist.",
      );
      return;
    }

    setSelectionActionStatus("running");
    setSelectionNote(null);

    try {
      const results = await Promise.all(
        selectedRows.map(async (row) => {
          const response = await fetch(
            `/api/workspaces/watchlists/${activeWatchlistId}/items`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ symbol: row.symbol }),
            },
          );

          return response.ok;
        }),
      );

      const successCount = results.filter(Boolean).length;

      if (successCount === 0) {
        throw new Error("No symbols were added to the watchlist.");
      }

      await saveSelectionSnapshot(activeWatchlistId);
      messageApi.success(
        `Added ${successCount}/${selectedRows.length} symbol${selectedRows.length === 1 ? "" : "s"} to watchlist.`,
      );
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : "Failed to add selected symbols.";
      setSelectionNote(messageText);
    } finally {
      setSelectionActionStatus("idle");
    }
  }, [activeWatchlistId, messageApi, saveSelectionSnapshot, selectedRows]);

  const numericInput = (
    field: keyof ScreenerQueryState,
    placeholder: string,
    width = 90,
  ) => (
    <InputNumber
      value={query[field] !== "" ? parseFloat(query[field] as string) : null}
      onChange={(v) => handleNumericChange(field, v)}
      placeholder={placeholder}
      style={{ width }}
      controls={false}
    />
  );

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#faad14",
          borderRadius: 6,
          colorBgContainer: "#0f1117",
          colorBgElevated: "#1a1d27",
          colorBorder: "#2a2d3a",
          colorText: "#e2e8f0",
          colorTextSecondary: "#94a3b8",
          fontFamily: "inherit",
        },
      }}
    >
      {messageContext}
      <main className={styles.page}>
        <div className={styles.glowBlue} />
        <div className={styles.glowGold} />

        <div className={styles.container}>
          <div className={styles.hero}>
            <h1 className={styles.title}>Screener</h1>
            <p className={styles.subtitle}>
              Filter securities by sector, valuation multiples, growth rates,
              and market cap. Fundamentals columns show where data is available.
            </p>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelContent}>
              <div className={styles.chipRow}>
                <span className={styles.chip}>
                  Coverage Mode: {coverageMode ?? "loading"}
                </span>
                <span className={styles.chip}>
                  Coverage Count: {coverageCount.toLocaleString()}
                </span>
                <span className={styles.chip}>
                  Total Matches: {total.toLocaleString()}
                </span>
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
              <h2 className={styles.sectionTitle}>Filters</h2>
            </div>

            {/* Search + security master filters */}
            <Space
              wrap
              size="middle"
              style={{ width: "100%", marginBottom: 16 }}
            >
              <Input.Search
                value={query.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onSearch={handleRunScreen}
                placeholder="Symbol or company name"
                allowClear
                style={{ width: 260 }}
              />

              {showSecurityMasterFilters &&
                visibleSecurityMasterFilters.map((key) => (
                  <Select
                    key={key}
                    value={query[key] || undefined}
                    onChange={(value) => handleFilterChange(key, value ?? "")}
                    placeholder={SECURITY_MASTER_FILTER_LABELS[key]}
                    allowClear
                    style={{ minWidth: 160 }}
                    options={supportedFilters[key].map((opt) => ({
                      label: opt,
                      value: opt,
                    }))}
                  />
                ))}
            </Space>

            <Divider style={{ borderColor: "#2a2d3a", margin: "12px 0" }} />

            {/* Market Cap Buckets */}
            <div style={{ marginBottom: 14 }}>
              <div className={styles.fieldLabel} style={{ marginBottom: 8 }}>
                Market Cap
              </div>
              <Checkbox.Group
                value={query.marketCapBuckets}
                onChange={(vals) =>
                  setQuery((q) => ({
                    ...q,
                    marketCapBuckets: vals as MarketCapBucket[],
                    page: 1,
                  }))
                }
                options={MARKET_CAP_BUCKET_OPTIONS}
              />
            </div>

            <Divider style={{ borderColor: "#2a2d3a", margin: "12px 0" }} />

            {/* Valuation Filters */}
            <div style={{ marginBottom: 14 }}>
              <div className={styles.fieldLabel} style={{ marginBottom: 10 }}>
                Valuation
              </div>
              <Space wrap size="middle">
                <Space size={4}>
                  <span className={styles.fieldLabel}>P/E</span>
                  {numericInput("peRatioMin", "Min")}
                  <span style={{ color: "#64748b" }}>–</span>
                  {numericInput("peRatioMax", "Max")}
                </Space>
                <Space size={4}>
                  <span className={styles.fieldLabel}>EV/EBITDA</span>
                  {numericInput("evToEbitdaMin", "Min")}
                  <span style={{ color: "#64748b" }}>–</span>
                  {numericInput("evToEbitdaMax", "Max")}
                </Space>
                <Space size={4}>
                  <span className={styles.fieldLabel}>P/B</span>
                  {numericInput("priceToBookMin", "Min")}
                  <span style={{ color: "#64748b" }}>–</span>
                  {numericInput("priceToBookMax", "Max")}
                </Space>
                <Space size={4}>
                  <span className={styles.fieldLabel}>P/S</span>
                  {numericInput("priceToSalesMin", "Min")}
                  <span style={{ color: "#64748b" }}>–</span>
                  {numericInput("priceToSalesMax", "Max")}
                </Space>
              </Space>
            </div>

            <Divider style={{ borderColor: "#2a2d3a", margin: "12px 0" }} />

            {/* Growth Filters */}
            <div style={{ marginBottom: 14 }}>
              <div className={styles.fieldLabel} style={{ marginBottom: 10 }}>
                Growth (YoY min %) — enter as decimal, e.g. 0.1 = 10%
              </div>
              <Space wrap size="middle">
                <Space size={4}>
                  <span className={styles.fieldLabel}>Revenue Growth ≥</span>
                  {numericInput("revenueGrowthMin", "e.g. 0.1", 110)}
                </Space>
                <Space size={4}>
                  <span className={styles.fieldLabel}>Earnings Growth ≥</span>
                  {numericInput("earningsGrowthMin", "e.g. 0.05", 110)}
                </Space>
                <Space size={4}>
                  <span className={styles.fieldLabel}>FCF Growth ≥</span>
                  {numericInput("fcfGrowthMin", "e.g. 0.0", 110)}
                </Space>
              </Space>
            </div>

            <div className={styles.actionRow}>
              <Button type="primary" onClick={handleRunScreen}>
                Run Screen
              </Button>

              {hasAnyActiveFilters ? (
                <Button onClick={clearAllFilters}>Clear All Filters</Button>
              ) : null}
            </div>
          </section>

          {coverageMode === "watchlist_fallback" ? (
            <div className={styles.warningPanel}>
              <p className={styles.warningText}>
                Watchlist fallback is active. Security-master-only company
                filters are intentionally hidden.
              </p>
            </div>
          ) : null}

          <section className={styles.panel}>
            <div className={styles.resultsHeader}>
              <h2 className={styles.sectionTitle}>Results</h2>
              <Space wrap size="small">
                <span className={styles.chip}>
                  Selected: {selectedRows.length.toLocaleString()}
                </span>
                <Select
                  value={activeWatchlistId || undefined}
                  onChange={(value) => setActiveWatchlistId(value)}
                  placeholder="Select watchlist"
                  loading={watchlistsLoading}
                  disabled={watchlists.length === 0}
                  style={{ minWidth: 220 }}
                  options={watchlists.map((watchlist) => ({
                    label: watchlist.name,
                    value: watchlist.id,
                  }))}
                />
                <Button
                  disabled={
                    selectedRows.length === 0 ||
                    selectionActionStatus === "running"
                  }
                  onClick={addSelectedToWatchlist}
                >
                  Add Selected To Watchlist
                </Button>
                <Button
                  type="primary"
                  disabled={
                    selectedRows.length === 0 ||
                    selectionActionStatus === "running"
                  }
                  onClick={() => {
                    void saveSelectionSnapshot(activeWatchlistId || undefined);
                  }}
                >
                  Save Selection Snapshot
                </Button>
              </Space>
            </div>

            {error ? <div className={styles.errorPanel}>{error}</div> : null}
            {selectionNote ? (
              <div style={{ marginBottom: 12 }} className={styles.panelText}>
                {selectionNote}
              </div>
            ) : null}

            {!error && !isLoading && isNoInternalCoverage ? (
              <div className={styles.emptyPanel}>
                <h3 className={styles.emptyTitle}>No internal coverage yet</h3>
                <p className={styles.emptyText}>
                  Run the FMP ingestion script to populate securities.
                </p>
              </div>
            ) : null}

            <Table<ScreenerResultRow>
              columns={TABLE_COLUMNS}
              dataSource={rows}
              rowSelection={rowSelection}
              rowKey={(row) => row.symbol}
              loading={isLoading}
              size="middle"
              scroll={{ x: 1200 }}
              pagination={{
                current: currentPage,
                pageSize: currentPageSize,
                total,
                showSizeChanger: true,
                pageSizeOptions: ["25", "50", "100", "200"],
                showTotal: (tot, range) =>
                  `${range[0]}–${range[1]} of ${tot.toLocaleString()} securities`,
              }}
              onChange={handleTableChange}
              style={{ marginTop: 8 }}
            />
          </section>
        </div>
      </main>
    </ConfigProvider>
  );
}
