/**
 * prefetch-fundamentals.ts
 *
 * Fetches and stores fundamentals for every symbol in the securities table
 * that doesn't already have data. Runs in batches to avoid rate limits.
 *
 * Usage:
 *   npx tsx scripts/prefetch-fundamentals.ts
 *   npx tsx scripts/prefetch-fundamentals.ts --limit=100
 *   npx tsx scripts/prefetch-fundamentals.ts --symbols=AAPL,MSFT,TSLA
 */

import "dotenv/config";
import postgres from "postgres";
import { fetchAndStoreFundamentals } from "../lib/fmp-fundamentals";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const symbolsArg = args.find((a) => a.startsWith("--symbols="));
const annualOnly = args.includes("--fast");

const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : 999_999;
const BATCH = 30;         // parallel requests per batch (Ultimate plan supports high concurrency)
const DELAY_MS = 50;      // minimal delay between batches
const fillMissing = args.includes("--fill-ratios"); // re-process symbols that have financials but missing valuation ratios

async function getSymbolsToFetch(): Promise<string[]> {
  if (symbolsArg) {
    return symbolsArg.split("=")[1].split(",").map((s) => s.trim().toUpperCase());
  }

  if (fillMissing) {
    // Symbols that HAVE financials but are missing pe_ratio in valuation_metrics
    // (e.g. Chinese stocks where FMP didn't return pre-calculated ratios)
    const rows = await sql<{ symbol: string }[]>`
      SELECT DISTINCT f.symbol
      FROM financials f
      WHERE EXISTS (
        SELECT 1 FROM valuation_metrics vm
        WHERE vm.symbol = f.symbol
          AND vm.pe_ratio IS NULL
          AND vm.price_to_book IS NULL
      )
      ORDER BY f.symbol ASC
      LIMIT ${LIMIT}
    `;
    return rows.map((r) => r.symbol);
  }

  // Default: symbols with NO entry in financials yet
  const rows = await sql<{ symbol: string }[]>`
    SELECT s.symbol
    FROM securities s
    WHERE NOT EXISTS (
      SELECT 1 FROM financials f WHERE f.symbol = s.symbol
    )
    ORDER BY s.symbol ASC
    LIMIT ${LIMIT}
  `;

  return rows.map((r) => r.symbol);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testApiKey() {
  const key = process.env.FMP_API_KEY;
  if (!key) {
    console.error("ERROR: FMP_API_KEY is not set in environment.");
    process.exit(1);
  }
  console.log(`FMP_API_KEY loaded: ${key.slice(0, 6)}${"*".repeat(key.length - 6)}`);

  const url = `https://financialmodelingprep.com/stable/income-statement?symbol=AAPL&period=annual&limit=1&apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`ERROR: FMP test request failed with status ${res.status}.`);
    const body = await res.text();
    console.error("Response:", body.slice(0, 300));
    process.exit(1);
  }
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    console.error("ERROR: FMP returned empty data for AAPL. Check your plan.");
    process.exit(1);
  }
  console.log(`FMP API key OK — AAPL income statement returned ${data.length} row(s).\n`);
}

async function main() {
  await testApiKey();
  const symbols = await getSymbolsToFetch();

  if (symbols.length === 0) {
    console.log("All symbols already have fundamentals data.");
    await sql.end();
    return;
  }

  const mode = fillMissing ? "fill-ratios" : annualOnly ? "fast" : "full";
  console.log(`Fetching fundamentals for ${symbols.length} symbols (batch=${BATCH}, mode=${mode})…\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < symbols.length; i += BATCH) {
    const batch = symbols.slice(i, i + BATCH);

    const results = await Promise.all(
      batch.map(async (symbol) => {
        try {
          const ok = await fetchAndStoreFundamentals(symbol, { annualOnly });
          return { symbol, ok };
        } catch (err) {
          return { symbol, ok: false, err };
        }
      }),
    );

    for (const { symbol, ok } of results) {
      if (ok) {
        success++;
        console.log(`  ✓  ${symbol}`);
      } else {
        skipped++;
        console.log(`  –  ${symbol}  (no data from FMP)`);
      }
    }

    const processed = Math.min(i + BATCH, symbols.length);
    console.log(`  [${processed}/${symbols.length}]  ok=${success}  skipped=${skipped}  failed=${failed}\n`);

    if (i + BATCH < symbols.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nDone.  success=${success}  skipped=${skipped}  failed=${failed}`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
