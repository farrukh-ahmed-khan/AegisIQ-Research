import { neon } from "@neondatabase/serverless";

type SecurityRow = {
  id: string;
  symbol: string;
  companyName: string | null;
  exchange: string | null;
  country: string | null;
  currency: string | null;
  securityType: string | null;
  sector: string | null;
  industry: string | null;
};

const BATCH_SIZE = 500;

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSymbol(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized.toUpperCase() : null;
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

function mapStockToSecurity(row: Record<string, string>): SecurityRow | null {
  const symbol = normalizeSymbol(row.symbol);
  if (!symbol) return null;

  const exchange =
    normalizeText(row.exchangeShortName) ?? normalizeText(row.exchange);
  const companyName =
    normalizeText(row.companyName) ?? normalizeText(row.name);

  return {
    id: buildSecurityId(symbol, exchange),
    symbol,
    companyName,
    exchange,
    country: normalizeText(row.country),
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
      headers.map((h, i) => [h.trim(), values[i] ?? ""])
    );
  });
}

async function upsertBatch(
  sql: ReturnType<typeof neon>,
  rows: SecurityRow[]
): Promise<void> {
  if (rows.length === 0) return;

  const values: Array<string | null> = [];
  const tuples: string[] = [];

  for (const row of rows) {
    const base = values.length;
    values.push(
      row.id,
      row.symbol,
      row.companyName,
      row.exchange,
      row.country,
      row.currency,
      row.securityType,
      row.sector,
      row.industry
    );
    tuples.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, NOW(), NOW())`
    );
  }

  await sql(
    `INSERT INTO securities (
      id, symbol, company_name, exchange, country, currency, security_type, sector, industry, created_at, updated_at
    ) VALUES ${tuples.join(",\n")}
    ON CONFLICT (id) DO UPDATE SET
      symbol = EXCLUDED.symbol,
      company_name = EXCLUDED.company_name,
      exchange = EXCLUDED.exchange,
      country = EXCLUDED.country,
      currency = EXCLUDED.currency,
      security_type = EXCLUDED.security_type,
      sector = EXCLUDED.sector,
      industry = EXCLUDED.industry,
      updated_at = NOW()`,
    values
  );
}

export const handler = async function () {
  const apiKey = normalizeText(process.env.FMP_API_KEY);
  if (!apiKey) {
    console.error("Missing FMP_API_KEY environment variable.");
    return { statusCode: 500, body: "Missing FMP_API_KEY" };
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Missing DATABASE_URL environment variable.");
    return { statusCode: 500, body: "Missing DATABASE_URL" };
  }

  const sql = neon(databaseUrl);

  console.log("Fetching stock list from FMP...");
  const url = `https://financialmodelingprep.com/stable/profile-bulk?part=0&apikey=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, { headers: { Accept: "text/csv" } });

  if (!response.ok) {
    const body = await response.text();
    console.error(`FMP request failed ${response.status}: ${body.slice(0, 300)}`);
    return { statusCode: 502, body: "FMP request failed" };
  }

  const text = await response.text();
  const rawRows = parseCSV(text);
  console.log(`Fetched ${rawRows.length} rows from FMP`);

  const dedupedRows = new Map<string, SecurityRow>();
  for (const raw of rawRows) {
    const mapped = mapStockToSecurity(raw);
    if (mapped) dedupedRows.set(mapped.id, mapped);
  }

  const rows = Array.from(dedupedRows.values());
  const batches = chunkArray(rows, BATCH_SIZE);
  console.log(`Upserting ${rows.length} securities in ${batches.length} batches...`);

  for (let i = 0; i < batches.length; i++) {
    await upsertBatch(sql, batches[i]);
    console.log(`Batch ${i + 1}/${batches.length} done`);
  }

  const countRows = await sql(
    `SELECT COUNT(*)::int AS count FROM securities`
  );
  console.log(`Total securities in DB: ${(countRows[0] as any)?.count}`);
  console.log("Security master sync complete.");

  return { statusCode: 200, body: "Sync complete" };
};
