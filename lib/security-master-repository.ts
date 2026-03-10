import { sql } from "drizzle-orm";

import db from "@/lib/db";
import type {
  SecurityMasterFilters,
  SecurityMasterScreenerResult,
  SecurityMasterScreenerRow,
  SecurityMasterSupportedFilters,
} from "@/lib/security-master-types";

type CountRow = {
  count: number | string;
};

type ValueRow = {
  value: string | null;
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildLikePattern(query?: string): string | null {
  if (!query) return null;

  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return null;

  return `%${trimmed}%`;
}

function normalizeLimit(limit?: number): number {
  if (typeof limit !== "number" || Number.isNaN(limit)) return 50;
  return Math.min(Math.max(Math.trunc(limit), 1), 200);
}

function normalizeOffset(offset?: number): number {
  if (typeof offset !== "number" || Number.isNaN(offset)) return 0;
  return Math.max(Math.trunc(offset), 0);
}

function parseCount(value: number | string | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseInt(value, 10) || 0;
  return 0;
}

function mapDistinctValues(rows: ValueRow[]): string[] {
  return rows
    .map((row) => row.value)
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .sort((a, b) => a.localeCompare(b));
}

export async function getSecurityMasterCoverageCount(
  workspaceId: string
): Promise<number> {
  const result = (await db.execute(sql<CountRow>`
    select count(*)::int as count
    from security_master
    where workspace_id = ${workspaceId}
  `)) as { rows: CountRow[] };

  return parseCount(result.rows[0]?.count);
}

export async function getSecurityMasterSupportedFilters(
  workspaceId: string
): Promise<SecurityMasterSupportedFilters> {
  const [
    sectorResult,
    industryResult,
    exchangeResult,
    countryResult,
    currencyResult,
    securityTypeResult,
  ] = await Promise.all([
    db.execute(sql<ValueRow>`
      select distinct sector as value
      from security_master
      where workspace_id = ${workspaceId}
        and sector is not null
        and trim(sector) <> ''
      order by sector asc
    `) as Promise<{ rows: ValueRow[] }>,
    db.execute(sql<ValueRow>`
      select distinct industry as value
      from security_master
      where workspace_id = ${workspaceId}
        and industry is not null
        and trim(industry) <> ''
      order by industry asc
    `) as Promise<{ rows: ValueRow[] }>,
    db.execute(sql<ValueRow>`
      select distinct exchange as value
      from security_master
      where workspace_id = ${workspaceId}
        and exchange is not null
        and trim(exchange) <> ''
      order by exchange asc
    `) as Promise<{ rows: ValueRow[] }>,
    db.execute(sql<ValueRow>`
      select distinct country as value
      from security_master
      where workspace_id = ${workspaceId}
        and country is not null
        and trim(country) <> ''
      order by country asc
    `) as Promise<{ rows: ValueRow[] }>,
    db.execute(sql<ValueRow>`
      select distinct currency as value
      from security_master
      where workspace_id = ${workspaceId}
        and currency is not null
        and trim(currency) <> ''
      order by currency asc
    `) as Promise<{ rows: ValueRow[] }>,
    db.execute(sql<ValueRow>`
      select distinct security_type as value
      from security_master
      where workspace_id = ${workspaceId}
        and security_type is not null
        and trim(security_type) <> ''
      order by security_type asc
    `) as Promise<{ rows: ValueRow[] }>,
  ]);

  return {
    sector: mapDistinctValues(sectorResult.rows),
    industry: mapDistinctValues(industryResult.rows),
    exchange: mapDistinctValues(exchangeResult.rows),
    country: mapDistinctValues(countryResult.rows),
    currency: mapDistinctValues(currencyResult.rows),
    securityType: mapDistinctValues(securityTypeResult.rows),
  };
}

export async function querySecurityMaster(
  workspaceId: string,
  filters: SecurityMasterFilters
): Promise<SecurityMasterScreenerResult> {
  const whereClauses: ReturnType<typeof sql>[] = [
    sql`workspace_id = ${workspaceId}`,
  ];

  if (typeof filters.isActive === "boolean") {
    whereClauses.push(sql`is_active = ${filters.isActive}`);
  } else {
    whereClauses.push(sql`is_active = true`);
  }

  const likePattern = buildLikePattern(filters.query);
  if (likePattern) {
    whereClauses.push(
      sql`(
        lower(symbol) like ${likePattern}
        or lower(company_name) like ${likePattern}
      )`
    );
  }

  const sector = normalizeStringArray(filters.sector);
  if (sector.length > 0) {
    whereClauses.push(sql`
      lower(coalesce(sector, '')) in (
        ${sql.join(sector.map((value) => sql`${value.toLowerCase()}`), sql`, `)}
      )
    `);
  }

  const industry = normalizeStringArray(filters.industry);
  if (industry.length > 0) {
    whereClauses.push(sql`
      lower(coalesce(industry, '')) in (
        ${sql.join(industry.map((value) => sql`${value.toLowerCase()}`), sql`, `)}
      )
    `);
  }

  const exchange = normalizeStringArray(filters.exchange);
  if (exchange.length > 0) {
    whereClauses.push(sql`
      lower(coalesce(exchange, '')) in (
        ${sql.join(exchange.map((value) => sql`${value.toLowerCase()}`), sql`, `)}
      )
    `);
  }

  const country = normalizeStringArray(filters.country);
  if (country.length > 0) {
    whereClauses.push(sql`
      lower(coalesce(country, '')) in (
        ${sql.join(country.map((value) => sql`${value.toLowerCase()}`), sql`, `)}
      )
    `);
  }

  const currency = normalizeStringArray(filters.currency);
  if (currency.length > 0) {
    whereClauses.push(sql`
      lower(coalesce(currency, '')) in (
        ${sql.join(currency.map((value) => sql`${value.toLowerCase()}`), sql`, `)}
      )
    `);
  }

  const securityType = normalizeStringArray(filters.securityType);
  if (securityType.length > 0) {
    whereClauses.push(sql`
      lower(coalesce(security_type, '')) in (
        ${sql.join(
          securityType.map((value) => sql`${value.toLowerCase()}`),
          sql`, `
        )}
      )
    `);
  }

  const whereSql = sql.join(whereClauses, sql` and `);
  const limit = normalizeLimit(filters.limit);
  const offset = normalizeOffset(filters.offset);

  const countResult = (await db.execute(sql<CountRow>`
    select count(*)::int as count
    from security_master
    where ${whereSql}
  `)) as { rows: CountRow[] };

  const dataResult = (await db.execute(sql<SecurityMasterScreenerRow>`
    select
      id,
      symbol,
      company_name as "companyName",
      exchange,
      sector,
      industry,
      country,
      currency,
      security_type as "securityType",
      is_active as "isActive",
      'security_master' as source
    from security_master
    where ${whereSql}
    order by company_name asc, symbol asc
    limit ${limit}
    offset ${offset}
  `)) as { rows: SecurityMasterScreenerRow[] };

  return {
    rows: dataResult.rows,
    total: parseCount(countResult.rows[0]?.count),
  };
}
