import {
  countSecurityMasterQuery,
  querySecurityMaster,
  type SecurityMasterQueryFilters,
  type SecurityMasterRecord,
} from "@/lib/security-master-repository";

const MAX_MULTI_VALUE_FILTERS = 50;
const MAX_LIMIT = 200;

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
    country: normalizeStringArray(source.country),
    currency: normalizeStringArray(source.currency),
    securityType: normalizeStringArray(source.securityType),
    symbol:
      Array.isArray(source.symbol) || typeof source.symbol === "string"
        ? (source.symbol as string | string[])
        : undefined,
    search: normalizeSearch(source.search),
    limit: normalizeLimit(source.limit),
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
