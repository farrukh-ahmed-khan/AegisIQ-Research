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
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
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

const TABLE_COLUMNS: ColumnsType<ScreenerResultRow> = [
  {
    title: "Symbol",
    dataIndex: "symbol",
    key: "symbol",
    width: 110,
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
    title: "Exchange",
    dataIndex: "exchange",
    key: "exchange",
    width: 100,
    render: (val: string | null) => val ?? "—",
  },
  {
    title: "Primary Exchange",
    dataIndex: "primaryExchange",
    key: "primaryExchange",
    width: 140,
    render: (val: string | null) => val ?? "—",
  },
  {
    title: "Region",
    dataIndex: "region",
    key: "region",
    width: 110,
    render: (val: string | null) => val ?? "—",
  },
  {
    title: "Sector",
    dataIndex: "sector",
    key: "sector",
    ellipsis: true,
    render: (val: string | null) => val ?? "—",
  },
  {
    title: "Country",
    dataIndex: "country",
    key: "country",
    width: 90,
    render: (val: string | null) => val ?? "—",
  },
  {
    title: "Currency",
    dataIndex: "currency",
    key: "currency",
    width: 90,
    render: (val: string | null) => val ?? "—",
  },
  {
    title: "Type",
    dataIndex: "securityType",
    key: "securityType",
    width: 100,
    render: (val: string | null) => (val ? <Tag color="blue">{val}</Tag> : "—"),
  },
  {
    title: "Status",
    dataIndex: "isActive",
    key: "isActive",
    width: 90,
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

  const clearSecurityMasterFilters = () => {
    setQuery((current) => ({
      ...current,
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
    }));
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

  const rows = data?.results ?? [];
  const total = data?.total ?? 0;
  const currentPage = data?.page ?? query.page;
  const currentPageSize = data?.pageSize ?? query.pageSize;

  const isNoInternalCoverage =
    coverageMode === "security_master" &&
    coverageCount === 0 &&
    rows.length === 0;

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
              Screen internal coverage safely. Security-master-backed filters
              only appear when the stored internal company dataset supports
              them.
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
                    options={[
                      ...supportedFilters[key].map((opt) => ({
                        label: opt,
                        value: opt,
                      })),
                    ]}
                  />
                ))}
            </Space>

            <div className={styles.actionRow}>
              <Button type="primary" onClick={handleRunScreen}>
                Run Screen
              </Button>

              {showSecurityMasterFilters && hasActiveSecurityMasterFilters ? (
                <Button onClick={clearSecurityMasterFilters}>
                  Clear Filters
                </Button>
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
              scroll={{ x: 800 }}
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
