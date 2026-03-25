import { sql } from "@/lib/db";

export type SecurityMasterFilterKey =
  | "sector"
  | "industry"
  | "exchange"
  | "country"
  | "currency"
  | "securityType";

export type SecurityMasterSupportedFilters = Record<
  SecurityMasterFilterKey,
  string[]
>;

export type SecurityMasterQueryFilters = {
  sector?: string[];
  industry?: string[];
  exchange?: string[];
  country?: string[];
  currency?: string[];
  securityType?: string[];
  symbol?: string | string[];
  search?: string;
  limit?: number;
  offset?: number;
};

export type SecurityMasterRecord = {
  id: string;
  symbol: string;
  companyName?: string | null;
  name?: string | null;
  sector?: string | null;
  industry?: string | null;
  exchange?: string | null;
  country?: string | null;
  currency?: string | null;
  securityType?: string | null;
};

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
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  country: string | null;
  currency: string | null;
  securityType: string | null;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

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

function normalizeLimit(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_LIMIT;
  }

  const safeInteger = Math.trunc(value);

  if (safeInteger <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(safeInteger, MAX_LIMIT);
}

function mapSecurityRow(row: RawSecurityRow): SecurityMasterRecord {
  return {
    id: row.id,
    symbol: row.symbol,
    companyName: row.companyName,
    name: row.companyName,
    sector: row.sector,
    industry: row.industry,
    exchange: row.exchange,
    country: row.country,
    currency: row.currency,
    securityType: row.securityType,
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

function normalizeSymbolValues(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => item.trim().toUpperCase())
      .filter((item) => item.length > 0);
  }

  if (typeof value === "string") {
    const trimmed = value.trim().toUpperCase();
    return trimmed.length > 0 ? [trimmed] : [];
  }

  return [];
}

function buildSearchClause(
  filters: SecurityMasterQueryFilters,
  params: Array<string | number>,
): string | undefined {
  const symbolValues = normalizeSymbolValues(filters.symbol);

  if (symbolValues.length > 0) {
    return buildInClause("UPPER(symbol)", symbolValues, params);
  }

  if (typeof filters.search !== "string" || filters.search.trim().length === 0) {
    return undefined;
  }

  const trimmedSearch = filters.search.trim();

  params.push(`%${trimmedSearch}%`);
  const companyNamePlaceholder = `$${params.length}`;

  params.push(`%${trimmedSearch.toUpperCase()}%`);
  const symbolPlaceholder = `$${params.length}`;

  return `(company_name ILIKE ${companyNamePlaceholder} OR UPPER(symbol) LIKE ${symbolPlaceholder})`;
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

export async function getSecurityMasterCoverageCount(
  _workspaceId: string,
): Promise<number> {
  const rows = await sql.unsafe<RawCountRow[]>(
    `
      SELECT COUNT(*)::int AS count
      FROM securities
    `,
    [],
  );

  return parseCount(rows[0]?.count);
}

export async function getSecurityMasterSupportedFilters(
  _workspaceId?: string,
): Promise<SecurityMasterSupportedFilters> {
  const [sector, industry, exchange, country, currency, securityType] =
    await Promise.all([
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

function buildWhereClause(
  filters: SecurityMasterQueryFilters | undefined,
  params: Array<string | number>,
): string {
  const whereClauses: string[] = [];

  if (filters?.sector && filters.sector.length > 0) {
    whereClauses.push(buildInClause("sector", filters.sector, params));
  }

  if (filters?.industry && filters.industry.length > 0) {
    whereClauses.push(buildInClause("industry", filters.industry, params));
  }

  if (filters?.exchange && filters.exchange.length > 0) {
    whereClauses.push(buildInClause("exchange", filters.exchange, params));
  }

  if (filters?.country && filters.country.length > 0) {
    whereClauses.push(buildInClause("country", filters.country, params));
  }

  if (filters?.currency && filters.currency.length > 0) {
    whereClauses.push(buildInClause("currency", filters.currency, params));
  }

  if (filters?.securityType && filters.securityType.length > 0) {
    whereClauses.push(buildInClause("security_type", filters.securityType, params));
  }

  const searchClause = buildSearchClause(filters ?? {}, params);
  if (searchClause) {
    whereClauses.push(searchClause);
  }

  return whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
}

export async function countSecurityMasterQuery(
  _workspaceId?: string,
  filters?: SecurityMasterQueryFilters,
): Promise<number> {
  const params: Array<string | number> = [];
  const whereSql = buildWhereClause(filters, params);

  const rows = await sql.unsafe<RawCountRow[]>(
    `SELECT COUNT(*)::int AS count FROM securities ${whereSql}`,
    params,
  );

  return parseCount(rows[0]?.count);
}

export async function querySecurityMaster(
  _workspaceId?: string,
  filters?: SecurityMasterQueryFilters,
): Promise<SecurityMasterRecord[]> {
  const params: Array<string | number> = [];
  const whereSql = buildWhereClause(filters, params);

  const limit = normalizeLimit(filters?.limit);
  params.push(limit);
  const limitPlaceholder = `$${params.length}`;

  const offset = Math.max(0, Math.trunc(filters?.offset ?? 0));
  params.push(offset);
  const offsetPlaceholder = `$${params.length}`;

  const rows = await sql.unsafe<RawSecurityRow[]>(
    `
      SELECT
        id,
        symbol,
        company_name AS "companyName",
        sector,
        industry,
        exchange,
        country,
        currency,
        security_type AS "securityType"
      FROM securities
      ${whereSql}
      ORDER BY symbol ASC
      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
    `,
    params,
  );

  return rows.map(mapSecurityRow);
}
