import {
  countSecurityMasterQuery,
  querySecurityMaster,
  type SecurityMasterQueryFilters,
  type SecurityMasterRecord,
} from "@/lib/security-master-repository";

const MAX_MULTI_VALUE_FILTERS = 50;
const MAX_LIMIT = 200;

const VALID_MARKET_CAP_BUCKETS = new Set(["nano", "micro", "small", "mid", "large", "mega"]);

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function normalizeMarketCapBuckets(value: unknown): string[] | undefined {
  const arr = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const valid = arr
    .map((v) => (typeof v === "string" ? v.trim().toLowerCase() : ""))
    .filter((v) => VALID_MARKET_CAP_BUCKETS.has(v));
  return valid.length > 0 ? valid : undefined;
}

export type SecurityMasterScreenerQueryInput = {
  workspaceId?: string;
  filters?: SecurityMasterQueryFilters;
};

export type SecurityMasterScreenerQueryResult = {
  results: SecurityMasterRecord[];
  total: number;
};

function normalizeStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0)
      .slice(0, MAX_MULTI_VALUE_FILTERS);

    return normalized.length > 0 ? normalized : undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : undefined;
  }

  return undefined;
}

function normalizeSearch(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 100) : undefined;
}

function normalizeLimit(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  const safeInteger = Math.trunc(value);

  if (safeInteger <= 0) {
    return undefined;
  }

  return Math.min(safeInteger, MAX_LIMIT);
}

export function normalizeSecurityMasterFilters(
  input: unknown,
): SecurityMasterQueryFilters {
  const source =
    input !== null && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};

  return {
    sector: normalizeStringArray(source.sector),
    industry: normalizeStringArray(source.industry),
    exchange: normalizeStringArray(source.exchange),
    primaryExchange: normalizeStringArray(source.primaryExchange),
    region: normalizeStringArray(source.region),
    isActive: normalizeStringArray(source.isActive),
    country: normalizeStringArray(source.country),
    currency: normalizeStringArray(source.currency),
    securityType: normalizeStringArray(source.securityType),
    symbol:
      Array.isArray(source.symbol) || typeof source.symbol === "string"
        ? (source.symbol as string | string[])
        : undefined,
    search: normalizeSearch(source.search),
    limit: normalizeLimit(source.limit),
    // Phase 12
    marketCapBucket: normalizeMarketCapBuckets(source.marketCapBucket),
    peRatioMin: normalizeOptionalNumber(source.peRatioMin),
    peRatioMax: normalizeOptionalNumber(source.peRatioMax),
    evToEbitdaMin: normalizeOptionalNumber(source.evToEbitdaMin),
    evToEbitdaMax: normalizeOptionalNumber(source.evToEbitdaMax),
    priceToBookMin: normalizeOptionalNumber(source.priceToBookMin),
    priceToBookMax: normalizeOptionalNumber(source.priceToBookMax),
    priceToSalesMin: normalizeOptionalNumber(source.priceToSalesMin),
    priceToSalesMax: normalizeOptionalNumber(source.priceToSalesMax),
    revenueGrowthMin: normalizeOptionalNumber(source.revenueGrowthMin),
    earningsGrowthMin: normalizeOptionalNumber(source.earningsGrowthMin),
    fcfGrowthMin: normalizeOptionalNumber(source.fcfGrowthMin),
  };
}

export async function runSecurityMasterScreenerQuery(
  input: SecurityMasterScreenerQueryInput,
): Promise<SecurityMasterScreenerQueryResult> {
  const [results, total] = await Promise.all([
    querySecurityMaster(input.workspaceId, input.filters),
    countSecurityMasterQuery(input.workspaceId, input.filters),
  ]);

  return {
    results,
    total,
  };
}

export const runSecurityMasterScreener = runSecurityMasterScreenerQuery;
