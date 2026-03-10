import { db } from "@/lib/db";
import type {
  ScreenerFilters,
  ScreenerResultRow,
  ScreenerRunResponse,
  ScreenerSupportedFilterMetadata,
} from "@/types/screener";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type InternalSymbolRow = {
  symbol: string;
};

const SUPPORTED_FILTER_METADATA: ScreenerSupportedFilterMetadata = {
  dataSource: "internal_watchlist_symbols",
  supportsCompanyName: false,
  supportsSector: false,
  supportsIndustry: false,
  supportsCountry: false,
  supportsExchange: false,
  supportsMarketCap: false,
  supportsPrice: false,
  supportsPeRatio: false,
  fields: [
    {
      key: "queryText",
      label: "Symbol / company search",
      supported: true,
    },
    {
      key: "sector",
      label: "Sector",
      supported: false,
      reason: "No sector coverage exists in the current internal screener dataset.",
    },
    {
      key: "industry",
      label: "Industry",
      supported: false,
      reason: "No industry coverage exists in the current internal screener dataset.",
    },
    {
      key: "country",
      label: "Country",
      supported: false,
      reason: "No country coverage exists in the current internal screener dataset.",
    },
    {
      key: "exchange",
      label: "Exchange",
      supported: false,
      reason: "No exchange coverage exists in the current internal screener dataset.",
    },
    {
      key: "marketCap",
      label: "Market cap",
      supported: false,
      reason: "No market cap coverage exists in the current internal screener dataset.",
    },
    {
      key: "price",
      label: "Price",
      supported: false,
      reason: "No price coverage exists in the current internal screener dataset.",
    },
    {
      key: "peRatio",
      label: "P/E ratio",
      supported: false,
      reason: "No P/E coverage exists in the current internal screener dataset.",
    },
  ],
};

function coerceNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function coerceNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeNumericRange(value: unknown): { min: number | null; max: number | null } {
  if (!value || typeof value !== "object") {
    return { min: null, max: null };
  }

  const range = value as Record<string, unknown>;

  return {
    min: coerceNullableNumber(range.min),
    max: coerceNullableNumber(range.max),
  };
}

export function normalizeScreenerFilters(input: unknown): ScreenerFilters {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    queryText: typeof raw.queryText === "string" ? raw.queryText.trim() : "",
    sector: coerceNullableString(raw.sector),
    industry: coerceNullableString(raw.industry),
    country: coerceNullableString(raw.country),
    exchange: coerceNullableString(raw.exchange),
    marketCap: normalizeNumericRange(raw.marketCap),
    price: normalizeNumericRange(raw.price),
    peRatio: normalizeNumericRange(raw.peRatio),
  };
}

export function normalizeScreenerLimit(input: unknown): number {
  const value =
    typeof input === "number"
      ? input
      : typeof input === "string"
        ? Number(input)
        : DEFAULT_LIMIT;

  if (!Number.isFinite(value)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(value)));
}

function getAppliedFilters(filters: ScreenerFilters): string[] {
  const applied: string[] = [];

  if (filters.queryText.trim().length > 0) {
    applied.push("queryText");
  }

  return applied;
}

function getUnsupportedRequestedFilters(filters: ScreenerFilters): string[] {
  const unsupported: string[] = [];

  if (filters.sector) unsupported.push("sector");
  if (filters.industry) unsupported.push("industry");
  if (filters.country) unsupported.push("country");
  if (filters.exchange) unsupported.push("exchange");
  if (filters.marketCap.min !== null || filters.marketCap.max !== null) unsupported.push("marketCap");
  if (filters.price.min !== null || filters.price.max !== null) unsupported.push("price");
  if (filters.peRatio.min !== null || filters.peRatio.max !== null) unsupported.push("peRatio");

  return unsupported;
}

async function loadInternalUniverse(): Promise<ScreenerResultRow[]> {
  const result = await db.execute(`
    select distinct upper(symbol) as symbol
    from watchlist_items
    where symbol is not null
      and length(trim(symbol)) > 0
    order by upper(symbol) asc
    limit 1000
  `);

  const rows =
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows?: unknown[] }).rows)
      ? ((result as { rows: InternalSymbolRow[] }).rows ?? [])
      : [];

  return rows
    .map((row) => ({
      symbol: typeof row.symbol === "string" ? row.symbol.trim().toUpperCase() : "",
      companyName: null,
      sector: null,
      industry: null,
      country: null,
      exchange: null,
      marketCap: null,
      price: null,
      peRatio: null,
    }))
    .filter((row) => row.symbol.length > 0);
}

export async function runWorkspaceScreener(input: {
  filters: unknown;
  limit?: unknown;
}): Promise<ScreenerRunResponse> {
  const filters = normalizeScreenerFilters(input.filters);
  const limit = normalizeScreenerLimit(input.limit);

  const appliedFilters = getAppliedFilters(filters);
  const unsupportedRequestedFilters = getUnsupportedRequestedFilters(filters);

  const universe = await loadInternalUniverse();
  const query = filters.queryText.trim().toLowerCase();

  const filtered = universe.filter((row) => {
    if (!query) {
      return true;
    }

    const symbolMatch = row.symbol.toLowerCase().includes(query);
    const companyMatch = (row.companyName ?? "").toLowerCase().includes(query);

    return symbolMatch || companyMatch;
  });

  const results = filtered.slice(0, limit);

  const message =
    universe.length === 0
      ? "No internal screener universe is currently available. This screener is production-safe and limited to symbols already present in internal watchlist data."
      : unsupportedRequestedFilters.length > 0
        ? "Results are limited to the current internal screener dataset. Some requested filters are not yet enforceable because the internal dataset does not contain those fields."
        : "Results are filtered only against the current internal screener dataset. No external market-data APIs are used.";

  return {
    ok: true,
    filters,
    results,
    total: filtered.length,
    limit,
    metadata: {
      ...SUPPORTED_FILTER_METADATA,
      appliedFilters,
      unsupportedRequestedFilters,
      message,
    },
  };
}
