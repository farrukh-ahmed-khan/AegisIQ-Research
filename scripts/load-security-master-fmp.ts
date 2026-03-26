import "dotenv/config";
import { sql } from "@/lib/db";

type SecurityRow = {
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

class FmpRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "FmpRequestError";
    this.status = status;
  }
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
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

  if (normalized.includes("NASDAQ")) {
    return "NASDAQ";
  }

  if (normalized.includes("NEW YORK") || normalized === "NYSE") {
    return "NYSE";
  }

  if (normalized.includes("AMEX") || normalized.includes("AMERICAN")) {
    return "AMEX";
  }

  return normalized;
}

function deriveRegion(country: string | null): string | null {
  if (!country) {
    return null;
  }

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
  ) {
    return "North America";
  }

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
  ) {
    return "Europe";
  }

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
  ) {
    return "APAC";
  }

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
  ) {
    return "LATAM";
  }

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
  ) {
    return "MEA";
  }

  return "Other";
}

function parseIsActive(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const token = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "active"].includes(token)) {
      return true;
    }

    if (["false", "0", "no", "n", "inactive"].includes(token)) {
      return false;
    }
  }

  if (typeof value === "number") {
    return value > 0;
  }

  return true;
}

function buildSecurityId(symbol: string, exchange: string | null): string {
  const exchangePart = (exchange ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const symbolPart = symbol
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `fmp_${symbolPart}_${exchangePart || "unknown"}`;
}

function mapStockToSecurity(row: any): SecurityRow | null {
  const symbol = normalizeSymbol(row.symbol);
  if (!symbol) return null;

  const exchange =
    normalizeText(row.exchangeShortName) ?? normalizeText(row.exchange);
  const primaryExchange = canonicalPrimaryExchange(exchange);
  const companyName = normalizeText(row.companyName) ?? normalizeText(row.name);
  const country = normalizeText(row.country);

  return {
    id: buildSecurityId(symbol, primaryExchange ?? exchange),
    symbol,
    companyName,
    normalizedCompanyName: normalizeCompanyName(companyName),
    exchange,
    primaryExchange,
    region: deriveRegion(country),
    isActive: parseIsActive(row.isActivelyTrading ?? row.isActive),
    isin: normalizeText(row.isin),
    figi: normalizeText(row.figi),
    country,
    currency: normalizeText(row.currency),
    securityType: "Equity",
    sector: normalizeText(row.sector),
    industry: normalizeText(row.industry),
  };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    return Object.fromEntries(
      headers.map((h, i) => [h.trim(), values[i] ?? ""]),
    );
  });
}

async function upsertBatch(rows: SecurityRow[]) {
  if (rows.length === 0) return;

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
    VALUES ${tuples.join(",\n")}
    ON CONFLICT (id) DO UPDATE SET
      symbol=EXCLUDED.symbol,
      company_name=EXCLUDED.company_name,
      normalized_company_name=EXCLUDED.normalized_company_name,
      exchange=EXCLUDED.exchange,
      primary_exchange=EXCLUDED.primary_exchange,
      region=EXCLUDED.region,
      is_active=EXCLUDED.is_active,
      isin=EXCLUDED.isin,
      figi=EXCLUDED.figi,
      country=EXCLUDED.country,
      currency=EXCLUDED.currency,
      security_type=EXCLUDED.security_type,
      sector=EXCLUDED.sector,
      industry=EXCLUDED.industry,
      updated_at=NOW()
  `,
    values,
  );
}

async function fetchStockList(apiKey: string): Promise<any[]> {
  const url = `https://financialmodelingprep.com/stable/profile-bulk?part=0&apikey=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    headers: { Accept: "text/csv" },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new FmpRequestError(
      `FMP stock list request failed with status ${response.status}: ${body.slice(0, 300)}`,
      response.status,
    );
  }

  const text = await response.text();
  return parseCSV(text);
}

async function loadSecurityMaster() {
  const apiKey = normalizeText(process.env.FMP_API_KEY);
  if (!apiKey) throw new Error("Missing FMP_API_KEY in environment.");

  console.log("Fetching stock list from FMP...");
  const rawRows = await fetchStockList(apiKey);

  // Support FMP_IMPORT_PARTS for testing
  const importParts = parseInt(process.env.FMP_IMPORT_PARTS || "0");
  const rowsToProcess =
    importParts > 0 ? rawRows.slice(0, importParts * BATCH_SIZE) : rawRows;

  console.log(`Total rows fetched: ${rawRows.length}`);
  console.log(`Rows to process: ${rowsToProcess.length}`);

  // Deduplicate & map
  const dedupedRows = new Map<string, SecurityRow>();
  for (const raw of rowsToProcess) {
    const mapped = mapStockToSecurity(raw);
    if (mapped) dedupedRows.set(mapped.id, mapped);
  }

  const rows = Array.from(dedupedRows.values());
  const batches = chunkArray(rows, BATCH_SIZE);

  console.log(
    `Upserting ${rows.length} securities in ${batches.length} batches...`,
  );
  let batchIndex = 1;
  for (const batch of batches) {
    console.log(
      `Upserting batch ${batchIndex}/${batches.length} (${batch.length} records)...`,
    );
    await upsertBatch(batch);
    batchIndex++;
  }

  const countRows = await sql.unsafe<Array<{ count: number | string }>>(
    `SELECT COUNT(*)::int AS count FROM securities`,
  );

  console.log("Security master load complete!");
  console.log(`Total securities in DB: ${countRows[0]?.count}`);
}

loadSecurityMaster()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Failed to load security master from FMP", e);
    process.exit(1);
  });
