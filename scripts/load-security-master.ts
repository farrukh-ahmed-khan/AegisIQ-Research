import fs from "node:fs/promises";
import path from "node:path";

import { sql } from "@/lib/db";

type SeedSecurity = {
  id: string;
  symbol: string;
  companyName: string | null;
  normalizedCompanyName: string | null;
  exchange: string | null;
  primaryExchange: string | null;
  region: string | null;
  isActive: boolean;
  isin: string | null;
  figi: string | null;
  country: string | null;
  currency: string | null;
  securityType: string | null;
  sector: string | null;
  industry: string | null;
};

const BATCH_SIZE = 500;

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSymbol(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized.toUpperCase() : null;
}

function normalizeCompanyName(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const compact = value
    .toLowerCase()
    .replace(/[.,'"()]/g, " ")
    .replace(
      /\b(inc|incorporated|corp|corporation|ltd|limited|plc|sa|ag|nv|holdings?)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  return compact.length > 0 ? compact : null;
}

function canonicalPrimaryExchange(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  if (normalized.includes("NASDAQ")) return "NASDAQ";
  if (normalized.includes("NEW YORK") || normalized === "NYSE") return "NYSE";
  if (normalized.includes("AMEX") || normalized.includes("AMERICAN"))
    return "AMEX";

  return normalized;
}

function deriveRegion(country: string | null): string | null {
  if (!country) return null;

  const token = country.trim().toUpperCase();
  if (
    [
      "US",
      "USA",
      "UNITED STATES",
      "CA",
      "CAN",
      "CANADA",
      "MX",
      "MEX",
      "MEXICO",
    ].includes(token)
  )
    return "North America";
  if (
    [
      "GB",
      "UK",
      "UNITED KINGDOM",
      "DE",
      "GERMANY",
      "FR",
      "FRANCE",
      "IT",
      "ITALY",
      "ES",
      "SPAIN",
      "NL",
      "NETHERLANDS",
      "SE",
      "SWEDEN",
      "CH",
      "SWITZERLAND",
    ].includes(token)
  )
    return "Europe";
  if (
    [
      "JP",
      "JAPAN",
      "CN",
      "CHINA",
      "HK",
      "HONG KONG",
      "SG",
      "SINGAPORE",
      "IN",
      "INDIA",
      "KR",
      "SOUTH KOREA",
      "AU",
      "AUSTRALIA",
      "NZ",
      "NEW ZEALAND",
    ].includes(token)
  )
    return "APAC";
  if (
    [
      "BR",
      "BRAZIL",
      "AR",
      "ARGENTINA",
      "CL",
      "CHILE",
      "CO",
      "COLOMBIA",
      "PE",
      "PERU",
    ].includes(token)
  )
    return "LATAM";
  if (
    [
      "AE",
      "UAE",
      "SA",
      "SAUDI ARABIA",
      "QA",
      "QATAR",
      "ZA",
      "SOUTH AFRICA",
      "EG",
      "EGYPT",
    ].includes(token)
  )
    return "MEA";

  return "Other";
}

function normalizeRow(input: unknown): SeedSecurity | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const row = input as Record<string, unknown>;
  const id = normalizeText(row.id);
  const symbol = normalizeSymbol(row.symbol);

  if (!id || !symbol) {
    return null;
  }

  return {
    id,
    symbol,
    companyName: normalizeText(row.companyName),
    normalizedCompanyName: normalizeCompanyName(normalizeText(row.companyName)),
    exchange: normalizeText(row.exchange),
    primaryExchange: canonicalPrimaryExchange(normalizeText(row.exchange)),
    country: normalizeText(row.country),
    region: deriveRegion(normalizeText(row.country)),
    isActive: true,
    isin: normalizeText(row.isin),
    figi: normalizeText(row.figi),
    currency: normalizeText(row.currency),
    securityType: normalizeText(row.securityType),
    sector: normalizeText(row.sector),
    industry: normalizeText(row.industry),
  };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function upsertBatch(rows: SeedSecurity[]): Promise<void> {
  // Ensure search_path is set to public schema
  await sql.unsafe(`SET search_path TO public`, []);

  const values: Array<string | null> = [];
  const tuples: string[] = [];

  for (const row of rows) {
    const base = values.length;

    values.push(
      row.id,
      row.symbol,
      row.companyName,
      row.normalizedCompanyName,
      row.exchange,
      row.primaryExchange,
      row.region,
      row.isActive ? "1" : "0",
      row.isin,
      row.figi,
      row.country,
      row.currency,
      row.securityType,
      row.sector,
      row.industry,
    );

    tuples.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, ($${base + 8} = '1'), $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, NOW(), NOW())`,
    );
  }

  await sql.unsafe(
    `
      INSERT INTO securities (
        id,
        symbol,
        company_name,
        normalized_company_name,
        exchange,
        primary_exchange,
        region,
        is_active,
        isin,
        figi,
        country,
        currency,
        security_type,
        sector,
        industry,
        created_at,
        updated_at
      )
      VALUES
        ${tuples.join(",\n")}
      ON CONFLICT (id)
      DO UPDATE SET
        symbol = EXCLUDED.symbol,
        company_name = EXCLUDED.company_name,
        normalized_company_name = EXCLUDED.normalized_company_name,
        exchange = EXCLUDED.exchange,
        primary_exchange = EXCLUDED.primary_exchange,
        region = EXCLUDED.region,
        is_active = EXCLUDED.is_active,
        isin = EXCLUDED.isin,
        figi = EXCLUDED.figi,
        country = EXCLUDED.country,
        currency = EXCLUDED.currency,
        security_type = EXCLUDED.security_type,
        sector = EXCLUDED.sector,
        industry = EXCLUDED.industry,
        updated_at = NOW()
    `,
    values,
  );
}

async function loadSecurityMaster(): Promise<void> {
  const seedPath = path.join(
    process.cwd(),
    "data",
    "security-master.seed.json",
  );
  const raw = await fs.readFile(seedPath, "utf8");
  const parsed = JSON.parse(raw) as unknown[];

  let processed = 0;
  let skipped = 0;

  const validRows: SeedSecurity[] = [];

  for (const item of parsed) {
    processed += 1;

    const row = normalizeRow(item);
    if (!row) {
      skipped += 1;
      continue;
    }

    validRows.push(row);
  }

  const batches = chunkArray(validRows, BATCH_SIZE);

  for (const batch of batches) {
    await upsertBatch(batch);
  }

  const countRows = await sql.unsafe<Array<{ count: number | string }>>(
    `
      SELECT COUNT(*)::int AS count
      FROM securities
    `,
    [],
  );

  console.log("Security master bulk load complete.");
  console.log(`Processed: ${processed}`);
  console.log(`Loaded: ${validRows.length}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Batches: ${batches.length}`);
  console.log(`Total securities: ${String(countRows[0]?.count ?? 0)}`);
}

loadSecurityMaster()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("Failed to bulk load security master", error);
    process.exit(1);
  });
