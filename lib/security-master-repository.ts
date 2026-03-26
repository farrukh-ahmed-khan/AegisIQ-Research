import { sql } from "@/lib/db";

export type SecurityMasterFilterKey =
  | "sector"
  | "industry"
  | "exchange"
  | "primaryExchange"
  | "region"
  | "isActive"
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
  primaryExchange?: string[];
  region?: string[];
  isActive?: string[];
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
  primaryExchange?: string | null;
  region?: string | null;
  isActive?: boolean;
  normalizedCompanyName?: string | null;
  isin?: string | null;
  figi?: string | null;
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

type RawColumnRow = {
  columnName: string;
};

type AvailableColumns = {
  normalizedCompanyName: boolean;
  primaryExchange: boolean;
  region: boolean;
  isActive: boolean;
  isin: boolean;
  figi: boolean;
};

type RawSecurityRow = {
  id: string;
  symbol: string;
  companyName: string | null;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  primaryExchange: string | null;
  region: string | null;
  isActive: boolean | null;
  normalizedCompanyName: string | null;
  isin: string | null;
  figi: string | null;
  country: string | null;
  currency: string | null;
  securityType: string | null;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

let availableColumnsPromise: Promise<AvailableColumns> | null = null;

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
    primaryExchange: row.primaryExchange,
    region: row.region,
    isActive: row.isActive ?? true,
    normalizedCompanyName: row.normalizedCompanyName,
    isin: row.isin,
    figi: row.figi,
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
  includeNormalizedCompanyName: boolean,
): string | undefined {
  const symbolValues = normalizeSymbolValues(filters.symbol);

  if (symbolValues.length > 0) {
    return buildInClause("UPPER(symbol)", symbolValues, params);
  }

  if (
    typeof filters.search !== "string" ||
    filters.search.trim().length === 0
  ) {
    return undefined;
  }

  const trimmedSearch = filters.search.trim();

  params.push(`%${trimmedSearch}%`);
  const companyNamePlaceholder = `$${params.length}`;

  params.push(`%${trimmedSearch.toUpperCase()}%`);
  const symbolPlaceholder = `$${params.length}`;

  if (includeNormalizedCompanyName) {
    params.push(`%${trimmedSearch.toLowerCase()}%`);
    const normalizedCompanyNamePlaceholder = `$${params.length}`;

    return `(company_name ILIKE ${companyNamePlaceholder} OR normalized_company_name LIKE ${normalizedCompanyNamePlaceholder} OR UPPER(symbol) LIKE ${symbolPlaceholder})`;
  }

  return `(company_name ILIKE ${companyNamePlaceholder} OR UPPER(symbol) LIKE ${symbolPlaceholder})`;
}

function normalizeIsActiveValues(values: string[] | undefined): boolean[] {
  if (!values || values.length === 0) {
    return [];
  }

  const normalized = new Set<boolean>();

  for (const value of values) {
    const token = value.trim().toLowerCase();

    if (["active", "true", "1", "yes", "y"].includes(token)) {
      normalized.add(true);
    }

    if (["inactive", "false", "0", "no", "n"].includes(token)) {
      normalized.add(false);
    }
  }

  return Array.from(normalized.values());
}

async function getDistinctNonEmptyValues(
  columnName: string,
): Promise<string[]> {
  const rows = await sql.unsafe<RawValueRow[]>(
    `
      SELECT DISTINCT ${columnName} AS value
      FROM public.securities
      WHERE ${columnName} IS NOT NULL
        AND BTRIM(${columnName}) <> ''
      ORDER BY ${columnName} ASC
    `,
    [],
  );

  return rows
    .map((row) => row.value)
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );
}

async function getAvailableColumns(): Promise<AvailableColumns> {
  if (!availableColumnsPromise) {
    availableColumnsPromise = (async () => {
      const rows = await sql.unsafe<RawColumnRow[]>(
        `
          SELECT column_name AS "columnName"
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'securities'
        `,
        [],
      );

      const set = new Set(rows.map((row) => row.columnName));

      return {
        normalizedCompanyName: set.has("normalized_company_name"),
        primaryExchange: set.has("primary_exchange"),
        region: set.has("region"),
        isActive: set.has("is_active"),
        isin: set.has("isin"),
        figi: set.has("figi"),
      };
    })();
  }

  return availableColumnsPromise;
}

export async function getSecurityMasterCoverageCount(
  _workspaceId: string,
): Promise<number> {
  const rows = await sql.unsafe<RawCountRow[]>(
    `
      SELECT COUNT(*)::int AS count
      FROM public.securities
    `,
    [],
  );

  return parseCount(rows[0]?.count);
}

export async function getSecurityMasterSupportedFilters(
  _workspaceId?: string,
): Promise<SecurityMasterSupportedFilters> {
  const availableColumns = await getAvailableColumns();

  const [
    sector,
    industry,
    exchange,
    primaryExchange,
    region,
    country,
    currency,
    securityType,
    isActiveRows,
  ] = await Promise.all([
    getDistinctNonEmptyValues("sector"),
    getDistinctNonEmptyValues("industry"),
    getDistinctNonEmptyValues("exchange"),
    availableColumns.primaryExchange
      ? getDistinctNonEmptyValues("primary_exchange")
      : Promise.resolve([]),
    availableColumns.region
      ? getDistinctNonEmptyValues("region")
      : Promise.resolve([]),
    getDistinctNonEmptyValues("country"),
    getDistinctNonEmptyValues("currency"),
    getDistinctNonEmptyValues("security_type"),
    availableColumns.isActive
      ? sql.unsafe<Array<{ isActive: boolean | null }>>(
          `
              SELECT DISTINCT is_active AS "isActive"
              FROM public.securities
              WHERE is_active IS NOT NULL
            `,
          [],
        )
      : Promise.resolve([]),
  ]);

  const isActive: string[] = [];
  if (isActiveRows.some((row) => row.isActive === true)) {
    isActive.push("Active");
  }
  if (isActiveRows.some((row) => row.isActive === false)) {
    isActive.push("Inactive");
  }

  return {
    sector,
    industry,
    exchange,
    primaryExchange,
    region,
    isActive,
    country,
    currency,
    securityType,
  };
}

function buildWhereClause(
  filters: SecurityMasterQueryFilters | undefined,
  params: Array<string | number>,
  availableColumns: AvailableColumns,
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

  if (
    availableColumns.primaryExchange &&
    filters?.primaryExchange &&
    filters.primaryExchange.length > 0
  ) {
    whereClauses.push(
      buildInClause("primary_exchange", filters.primaryExchange, params),
    );
  }

  if (availableColumns.region && filters?.region && filters.region.length > 0) {
    whereClauses.push(buildInClause("region", filters.region, params));
  }

  if (availableColumns.isActive) {
    const isActiveValues = normalizeIsActiveValues(filters?.isActive);
    if (isActiveValues.length === 1) {
      params.push(isActiveValues[0] ? 1 : 0);
      whereClauses.push(`is_active = ($${params.length} = 1)`);
    } else if (isActiveValues.length === 2) {
      whereClauses.push("is_active IN (true, false)");
    }
  }

  if (filters?.country && filters.country.length > 0) {
    whereClauses.push(buildInClause("country", filters.country, params));
  }

  if (filters?.currency && filters.currency.length > 0) {
    whereClauses.push(buildInClause("currency", filters.currency, params));
  }

  if (filters?.securityType && filters.securityType.length > 0) {
    whereClauses.push(
      buildInClause("security_type", filters.securityType, params),
    );
  }

  const searchClause = buildSearchClause(
    filters ?? {},
    params,
    availableColumns.normalizedCompanyName,
  );
  if (searchClause) {
    whereClauses.push(searchClause);
  }

  return whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
}

export async function countSecurityMasterQuery(
  _workspaceId?: string,
  filters?: SecurityMasterQueryFilters,
): Promise<number> {
  const availableColumns = await getAvailableColumns();

  const params: Array<string | number> = [];
  const whereSql = buildWhereClause(filters, params, availableColumns);

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
  const availableColumns = await getAvailableColumns();

  const params: Array<string | number> = [];
  const whereSql = buildWhereClause(filters, params, availableColumns);

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
        ${availableColumns.normalizedCompanyName ? "normalized_company_name" : "NULL::text"} AS "normalizedCompanyName",
        sector,
        industry,
        exchange,
        ${availableColumns.primaryExchange ? "primary_exchange" : "NULL::text"} AS "primaryExchange",
        ${availableColumns.region ? "region" : "NULL::text"} AS region,
        ${availableColumns.isActive ? "is_active" : "NULL::boolean"} AS "isActive",
        ${availableColumns.isin ? "isin" : "NULL::text"} AS isin,
        ${availableColumns.figi ? "figi" : "NULL::text"} AS figi,
        country,
        currency,
        security_type AS "securityType"
      FROM public.securities
      ${whereSql}
      ORDER BY symbol ASC
      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
    `,
    params,
  );

  return rows.map(mapSecurityRow);
}
