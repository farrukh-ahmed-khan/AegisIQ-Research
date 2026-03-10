import { sql } from "@/lib/db";

type NullableString = string | null;

const MAX_MULTI_VALUE_FILTERS = 50;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export interface SecurityMasterRow {
  id: string;
  symbol: string;
  companyName: NullableString;
  exchange: NullableString;
  country: NullableString;
  currency: NullableString;
  securityType: NullableString;
  sector: NullableString;
  industry: NullableString;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityMasterSupportedFilters {
  sector: string[];
  industry: string[];
  exchange: string[];
  country: string[];
  currency: string[];
  securityType: string[];
}

export interface SecurityMasterFilters {
  sector?: string[];
  industry?: string[];
  exchange?: string[];
  country?: string[];
  currency?: string[];
  securityType?: string[];
  symbol?: string | string[];
  search?: string;
  limit?: number;
}

type RawCountRow = {
  count: number | string;
};

type RawValueRow = {
  value: string | null;
};

type RawSecurityRow = {
  id: string;
  symbol: string;
  companyName: string | null;
  exchange: string | null;
  country: string | null;
  currency: string | null;
  securityType: string | null;
  sector: string | null;
  industry: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
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

function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function parseCount(value: number | string | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function mapSecurityRow(row: RawSecurityRow): SecurityMasterRow {
  return {
    id: row.id,
    symbol: row.symbol,
    companyName: row.companyName,
    exchange: row.exchange,
    country: row.country,
    currency: row.currency,
    securityType: row.securityType,
    sector: row.sector,
    industry: row.industry,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function buildInClause(
  fieldName: string,
  values: string[],
  params: Array<string | number>,
): string {
  const placeholders = values.map((value) => {
    params.push(value);
    return `$${params.length}`;
  });

  return `${fieldName} IN (${placeholders.join(", ")})`;
}

function buildSymbolOrSearchClause(
  filters: SecurityMasterFilters,
  params: Array<string | number>,
): string | undefined {
  const symbolValues = normalizeStringArray(filters.symbol);

  if (symbolValues && symbolValues.length > 0) {
    const upperValues = symbolValues.map((value) => value.toUpperCase());
    return buildInClause("UPPER(symbol)", upperValues, params);
  }

  const search = normalizeSearch(filters.search);

  if (!search) {
    return undefined;
  }

  params.push(`%${search}%`);
  const companyNamePlaceholder = `$${params.length}`;

  params.push(`%${search.toUpperCase()}%`);
  const symbolPlaceholder = `$${params.length}`;

  return `(company_name ILIKE ${companyNamePlaceholder} OR UPPER(symbol) LIKE ${symbolPlaceholder})`;
}

export function normalizeSecurityMasterFilters(input: unknown): SecurityMasterFilters {
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
        ? source.symbol
        : undefined,
    search: normalizeSearch(source.search),
    limit: normalizeLimit(source.limit),
  };
}

export async function getSecurityMasterCoverageCount(_workspaceId: string): Promise<number> {
  const rows = await sql.unsafe<RawCountRow[]>(
    `
      SELECT COUNT(*)::int AS count
      FROM securities
    `,
    [],
  );

  return parseCount(rows[0]?.count);
}

async function getDistinctNonEmptyValues(columnName: string): Promise<string[]> {
  const rows = await sql.unsafe<RawValueRow[]>(
    `
      SELECT DISTINCT ${columnName} AS value
      FROM securities
      WHERE ${columnName} IS NOT NULL
        AND BTRIM(${columnName}) <> ''
      ORDER BY ${columnName} ASC
    `,
    [],
  );

  return rows
    .map((row) => row.value)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

export async function getSecurityMasterSupportedFilters(
  _workspaceId?: string,
): Promise<SecurityMasterSupportedFilters> {
  const [sector, industry, exchange, country, currency, securityType] = await Promise.all([
    getDistinctNonEmptyValues("sector"),
    getDistinctNonEmptyValues("industry"),
    getDistinctNonEmptyValues("exchange"),
    getDistinctNonEmptyValues("country"),
    getDistinctNonEmptyValues("currency"),
    getDistinctNonEmptyValues("security_type"),
  ]);

  return {
    sector,
    industry,
    exchange,
    country,
    currency,
    securityType,
  };
}

export async function querySecurityMaster(
  _workspaceId?: string,
  filters?: SecurityMasterFilters,
): Promise<SecurityMasterRow[]> {
  const normalizedFilters = normalizeSecurityMasterFilters(filters ?? {});
  const params: Array<string | number> = [];
  const whereClauses: string[] = [];

  if (normalizedFilters.sector && normalizedFilters.sector.length > 0) {
    whereClauses.push(buildInClause("sector", normalizedFilters.sector, params));
  }

  if (normalizedFilters.industry && normalizedFilters.industry.length > 0) {
    whereClauses.push(buildInClause("industry", normalizedFilters.industry, params));
  }

  if (normalizedFilters.exchange && normalizedFilters.exchange.length > 0) {
    whereClauses.push(buildInClause("exchange", normalizedFilters.exchange, params));
  }

  if (normalizedFilters.country && normalizedFilters.country.length > 0) {
    whereClauses.push(buildInClause("country", normalizedFilters.country, params));
  }

  if (normalizedFilters.currency && normalizedFilters.currency.length > 0) {
    whereClauses.push(buildInClause("currency", normalizedFilters.currency, params));
  }

  if (normalizedFilters.securityType && normalizedFilters.securityType.length > 0) {
    whereClauses.push(buildInClause("security_type", normalizedFilters.securityType, params));
  }

  const symbolOrSearchClause = buildSymbolOrSearchClause(normalizedFilters, params);
  if (symbolOrSearchClause) {
    whereClauses.push(symbolOrSearchClause);
  }

  const limit = normalizedFilters.limit ?? DEFAULT_LIMIT;
  params.push(limit);
  const limitPlaceholder = `$${params.length}`;

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const rows = await sql.unsafe<RawSecurityRow[]>(
    `
      SELECT
        id,
        symbol,
        company_name AS "companyName",
        exchange,
        country,
        currency,
        security_type AS "securityType",
        sector,
        industry,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM securities
      ${whereSql}
      ORDER BY symbol ASC
      LIMIT ${limitPlaceholder}
    `,
    params,
  );

  return rows.map(mapSecurityRow);
}
