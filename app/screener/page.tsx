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
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
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
      <span style={{ fontWeight: 600, color: "#faad14", fontFamily: "monospace" }}>
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
    sorter: (a, b) => Number(a.revenueGrowthYoy ?? -Infinity) - Number(b.revenueGrowthYoy ?? -Infinity),
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
    sorter: (a, b) => Number(a.earningsGrowthYoy ?? -Infinity) - Number(b.earningsGrowthYoy ?? -Infinity),
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

        // Phase 12 — advanced filters (always sent)
        if (activeQuery.marketCapBuckets.length > 0) {
          filters.marketCapBucket = activeQuery.marketCapBuckets;
        }
        const p = (v: string) => { const n = parseFloat(v); return isFinite(n) ? n : undefined; };
        if (p(activeQuery.peRatioMin) !== undefined) filters.peRatioMin = p(activeQuery.peRatioMin);
        if (p(activeQuery.peRatioMax) !== undefined) filters.peRatioMax = p(activeQuery.peRatioMax);
        if (p(activeQuery.evToEbitdaMin) !== undefined) filters.evToEbitdaMin = p(activeQuery.evToEbitdaMin);
        if (p(activeQuery.evToEbitdaMax) !== undefined) filters.evToEbitdaMax = p(activeQuery.evToEbitdaMax);
        if (p(activeQuery.priceToBookMin) !== undefined) filters.priceToBookMin = p(activeQuery.priceToBookMin);
        if (p(activeQuery.priceToBookMax) !== undefined) filters.priceToBookMax = p(activeQuery.priceToBookMax);
        if (p(activeQuery.priceToSalesMin) !== undefined) filters.priceToSalesMin = p(activeQuery.priceToSalesMin);
        if (p(activeQuery.priceToSalesMax) !== undefined) filters.priceToSalesMax = p(activeQuery.priceToSalesMax);
        if (p(activeQuery.revenueGrowthMin) !== undefined) filters.revenueGrowthMin = p(activeQuery.revenueGrowthMin);
        if (p(activeQuery.earningsGrowthMin) !== undefined) filters.earningsGrowthMin = p(activeQuery.earningsGrowthMin);
        if (p(activeQuery.fcfGrowthMin) !== undefined) filters.fcfGrowthMin = p(activeQuery.fcfGrowthMin);

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

  useEffect(() => {
    void loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchChange = (value: string) => {
    setQuery((current) => ({ ...current, search: value, page: 1 }));
  };

  const handleFilterChange = (key: ScreenerFilterKey, value: string) => {
    setQuery((current) => ({ ...current, [key]: value, page: 1 }));
  };

  const handleNumericChange = (field: keyof ScreenerQueryState, value: number | null) => {
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
    query.peRatioMin !== "" || query.peRatioMax !== "" ||
    query.evToEbitdaMin !== "" || query.evToEbitdaMax !== "" ||
    query.priceToBookMin !== "" || query.priceToBookMax !== "" ||
    query.priceToSalesMin !== "" || query.priceToSalesMax !== "" ||
    query.revenueGrowthMin !== "" || query.earningsGrowthMin !== "" ||
    query.fcfGrowthMin !== "";

  const hasAnyActiveFilters =
    query.search.trim().length > 0 ||
    hasActiveSecurityMasterFilters ||
    hasActiveAdvancedFilters;

  const rows = data?.results ?? [];
  const total = data?.total ?? 0;
  const currentPage = data?.page ?? query.page;
  const currentPageSize = data?.pageSize ?? query.pageSize;

  const isNoInternalCoverage =
    coverageMode === "security_master" &&
    coverageCount === 0 &&
    rows.length === 0;

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
            <Space wrap size="middle" style={{ width: "100%", marginBottom: 16 }}>
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
            </div>

            {error ? <div className={styles.errorPanel}>{error}</div> : null}

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
              rowKey={(row) => row.id ?? row.symbol}
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
