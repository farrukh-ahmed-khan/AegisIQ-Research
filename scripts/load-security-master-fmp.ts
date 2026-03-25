// import "dotenv/config";
// import { sql } from "@/lib/db";

// type SecurityRow = {
//   id: string;
//   symbol: string;
//   companyName: string | null;
//   exchange: string | null;
//   country: string | null;
//   currency: string | null;
//   securityType: string | null;
//   sector: string | null;
//   industry: string | null;
// };

// type FmpProfile = Record<string, unknown>;

// const BATCH_SIZE = 500;
// const DEFAULT_PARTS = 1;
// const DEFAULT_START_PART = 0;
// const DEFAULT_REQUEST_DELAY_MS = 150;
// const DEFAULT_STOCK_LIST_LIMIT = 1000;
// const FMP_BULK_PROFILE_ENDPOINT =
//   "https://financialmodelingprep.com/stable/profile-bulk";
// const FMP_STOCK_LIST_ENDPOINT =
//   "https://financialmodelingprep.com/stable/stock-screener";

// class FmpRequestError extends Error {
//   status: number;

//   constructor(message: string, status: number) {
//     super(message);
//     this.name = "FmpRequestError";
//     this.status = status;
//   }
// }

// function normalizeText(value: unknown): string | null {
//   if (typeof value !== "string") {
//     return null;
//   }

//   const trimmed = value.trim();
//   return trimmed.length > 0 ? trimmed : null;
// }

// function normalizeSymbol(value: unknown): string | null {
//   const normalized = normalizeText(value);
//   return normalized ? normalized.toUpperCase() : null;
// }

// function parseIntegerEnv(value: string | undefined, fallback: number): number {
//   if (!value) {
//     return fallback;
//   }

//   const parsed = Number.parseInt(value, 10);
//   return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
// }

// function sleep(ms: number): Promise<void> {
//   return new Promise((resolve) => {
//     setTimeout(resolve, ms);
//   });
// }

// function toSecurityType(value: unknown): string {
//   const normalized = normalizeText(value);
//   if (!normalized) {
//     return "Equity";
//   }

//   return normalized;
// }

// function buildSecurityId(symbol: string, exchange: string | null): string {
//   const exchangePart = (exchange ?? "unknown")
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, "_")
//     .replace(/^_+|_+$/g, "");

//   const symbolPart = symbol
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, "_")
//     .replace(/^_+|_+$/g, "");

//   return `fmp_${symbolPart}_${exchangePart || "unknown"}`;
// }

// function mapFmpProfileToSecurity(input: unknown): SecurityRow | null {
//   if (!input || typeof input !== "object") {
//     return null;
//   }

//   const row = input as FmpProfile;

//   const symbol = normalizeSymbol(row.symbol);
//   if (!symbol) {
//     return null;
//   }

//   const exchange =
//     normalizeText(row.exchangeShortName) ?? normalizeText(row.exchange);
//   const companyName = normalizeText(row.companyName) ?? normalizeText(row.name);

//   return {
//     id: buildSecurityId(symbol, exchange),
//     symbol,
//     companyName,
//     exchange,
//     country: normalizeText(row.country),
//     currency: normalizeText(row.currency),
//     securityType: toSecurityType(row.securityType ?? row.type),
//     sector: normalizeText(row.sector),
//     industry: normalizeText(row.industry),
//   };
// }

// function chunkArray<T>(items: T[], size: number): T[][] {
//   const chunks: T[][] = [];

//   for (let index = 0; index < items.length; index += size) {
//     chunks.push(items.slice(index, index + size));
//   }

//   return chunks;
// }

// async function upsertBatch(rows: SecurityRow[]): Promise<void> {
//   const values: Array<string | null> = [];
//   const tuples: string[] = [];

//   for (const row of rows) {
//     const base = values.length;

//     values.push(
//       row.id,
//       row.symbol,
//       row.companyName,
//       row.exchange,
//       row.country,
//       row.currency,
//       row.securityType,
//       row.sector,
//       row.industry,
//     );

//     tuples.push(
//       `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, NOW(), NOW())`,
//     );
//   }

//   await sql.unsafe(
//     `
//       INSERT INTO securities (
//         id,
//         symbol,
//         company_name,
//         exchange,
//         country,
//         currency,
//         security_type,
//         sector,
//         industry,
//         created_at,
//         updated_at
//       )
//       VALUES
//         ${tuples.join(",\n")}
//       ON CONFLICT (id)
//       DO UPDATE SET
//         symbol = EXCLUDED.symbol,
//         company_name = EXCLUDED.company_name,
//         exchange = EXCLUDED.exchange,
//         country = EXCLUDED.country,
//         currency = EXCLUDED.currency,
//         security_type = EXCLUDED.security_type,
//         sector = EXCLUDED.sector,
//         industry = EXCLUDED.industry,
//         updated_at = NOW()
//     `,
//     values,
//   );
// }

// async function fetchFmpPart(part: number, apiKey: string): Promise<unknown[]> {
//   const url = `${FMP_BULK_PROFILE_ENDPOINT}?part=${encodeURIComponent(String(part))}&apikey=${encodeURIComponent(apiKey)}`;
//   const response = await fetch(url, {
//     method: "GET",
//     headers: {
//       Accept: "application/json",
//     },
//     cache: "no-store",
//   });

//   if (!response.ok) {
//     const body = await response.text();
//     throw new FmpRequestError(
//       `FMP request failed for part ${part} with status ${response.status}: ${body.slice(0, 300)}`,
//       response.status,
//     );
//   }

//   const payload = (await response.json()) as unknown;
//   return Array.isArray(payload) ? payload : [];
// }

// async function fetchFmpStockList(apiKey: string): Promise<unknown[]> {
//   const url = `${FMP_STOCK_LIST_ENDPOINT}?exchange=NASDAQ,NYSE,AMEX&limit=10000&apikey=${encodeURIComponent(apiKey)}`;

//   const response = await fetch(url, {
//     method: "GET",
//     headers: { Accept: "application/json" },
//     cache: "no-store",
//   });

//   if (!response.ok) {
//     const body = await response.text();
//     throw new FmpRequestError(
//       `FMP stock list request failed with status ${response.status}: ${body.slice(0, 300)}`,
//       response.status,
//     );
//   }

//   const payload = await response.json();
//   return Array.isArray(payload) ? payload : [];
// }

// async function loadSecurityMasterFromFmp(): Promise<void> {
//   const apiKey = normalizeText(process.env.FMP_API_KEY);
//   if (!apiKey) {
//     throw new Error("Missing FMP_API_KEY. Set it in your environment.");
//   }

//   const parts = parseIntegerEnv(process.env.FMP_IMPORT_PARTS, DEFAULT_PARTS);
//   const startPart = parseIntegerEnv(
//     process.env.FMP_IMPORT_START_PART,
//     DEFAULT_START_PART,
//   );
//   const requestDelayMs = parseIntegerEnv(
//     process.env.FMP_REQUEST_DELAY_MS,
//     DEFAULT_REQUEST_DELAY_MS,
//   );
//   const stockListLimit = parseIntegerEnv(
//     process.env.FMP_STOCK_LIST_LIMIT,
//     DEFAULT_STOCK_LIST_LIMIT,
//   );
//   const allowStockListFallback =
//     (process.env.FMP_ALLOW_STOCK_LIST_FALLBACK ?? "true").toLowerCase() !==
//     "false";

//   if (parts <= 0) {
//     throw new Error("FMP_IMPORT_PARTS must be greater than 0.");
//   }

//   let fetched = 0;
//   let processed = 0;
//   let skipped = 0;
//   let importSource: "profile_bulk" | "stock_list_fallback" = "profile_bulk";

//   const dedupedRows = new Map<string, SecurityRow>();

//   const processRows = (rawRows: unknown[]) => {
//     fetched += rawRows.length;

//     for (const raw of rawRows) {
//       processed += 1;

//       const normalized = mapFmpProfileToSecurity(raw);
//       if (!normalized) {
//         skipped += 1;
//         continue;
//       }

//       dedupedRows.set(normalized.id, normalized);
//     }
//   };

//   try {
//     const firstPartRows = await fetchFmpPart(startPart, apiKey);
//     processRows(firstPartRows);
//     console.log(
//       `Fetched part ${startPart}: ${firstPartRows.length} rows (running unique total: ${dedupedRows.size})`,
//     );

//     for (let offset = 1; offset < parts; offset += 1) {
//       const part = startPart + offset;
//       const rawRows = await fetchFmpPart(part, apiKey);
//       processRows(rawRows);

//       console.log(
//         `Fetched part ${part}: ${rawRows.length} rows (running unique total: ${dedupedRows.size})`,
//       );

//       if (offset < parts - 1 && requestDelayMs > 0) {
//         await sleep(requestDelayMs);
//       }
//     }
//   } catch (error) {
//     if (
//       allowStockListFallback &&
//       error instanceof FmpRequestError &&
//       (error.status === 402 || error.status === 403)
//     ) {
//       importSource = "stock_list_fallback";

//       const stockRows = await fetchFmpStockList(apiKey);
//       const startIndex = Math.max(startPart * stockListLimit, 0);
//       const maxRows = Math.max(parts * stockListLimit, stockListLimit);
//       const sliced = stockRows.slice(startIndex, startIndex + maxRows);
//       processRows(sliced);

//       console.log(
//         `Bulk endpoint unavailable (402). Fallback loaded ${sliced.length} stock-list rows.`,
//       );
//     } else {
//       throw error;
//     }
//   }

//   const rows = Array.from(dedupedRows.values());
//   const batches = chunkArray(rows, BATCH_SIZE);

//   for (const batch of batches) {
//     await upsertBatch(batch);
//   }

//   const countRows = await sql.unsafe<Array<{ count: number | string }>>(
//     `
//       SELECT COUNT(*)::int AS count
//       FROM securities
//     `,
//     [],
//   );

//   console.log("Security master FMP load complete.");
//   console.log(`Source: ${importSource}`);
//   console.log(`Start part: ${startPart}`);
//   console.log(`Parts requested: ${parts}`);
//   console.log(`Rows fetched: ${fetched}`);
//   console.log(`Rows processed: ${processed}`);
//   console.log(`Rows skipped: ${skipped}`);
//   console.log(`Rows upserted (unique): ${rows.length}`);
//   console.log(`Batches: ${batches.length}`);
//   console.log(`Total securities: ${String(countRows[0]?.count ?? 0)}`);
// }

// loadSecurityMasterFromFmp()
//   .then(() => process.exit(0))
//   .catch((error: unknown) => {
//     console.error("Failed to load security master from FMP", error);
//     process.exit(1);
//   });

import "dotenv/config";
import { sql } from "@/lib/db";

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
  const companyName = normalizeText(row.companyName) ?? normalizeText(row.name);

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
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current); current = ""; }
      else { current += ch; }
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
    return Object.fromEntries(headers.map((h, i) => [h.trim(), values[i] ?? ""]));
  });
}

async function upsertBatch(rows: SecurityRow[]) {
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
      row.industry,
    );
    tuples.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, NOW(), NOW())`,
    );
  }

  await sql.unsafe(
    `
    INSERT INTO securities (
      id,symbol,company_name,exchange,country,currency,security_type,sector,industry,created_at,updated_at
    )
    VALUES ${tuples.join(",\n")}
    ON CONFLICT (id) DO UPDATE SET
      symbol=EXCLUDED.symbol,
      company_name=EXCLUDED.company_name,
      exchange=EXCLUDED.exchange,
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
