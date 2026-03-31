import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  // 1. Row counts
  const counts = await sql<{ tbl: string; cnt: number }[]>`
    SELECT 'financials'        AS tbl, COUNT(*)::int AS cnt FROM financials
    UNION ALL
    SELECT 'financials_annual',        COUNT(*)::int FROM financials WHERE period_type = 'annual'
    UNION ALL
    SELECT 'valuation_metrics',        COUNT(*)::int FROM valuation_metrics
    UNION ALL
    SELECT 'vm_with_market_cap',       COUNT(*)::int FROM valuation_metrics WHERE market_cap > 0
    UNION ALL
    SELECT 'vm_market_cap_null',       COUNT(*)::int FROM valuation_metrics WHERE market_cap IS NULL
    UNION ALL
    SELECT 'vm_pe_null',               COUNT(*)::int FROM valuation_metrics WHERE pe_ratio IS NULL
    UNION ALL
    SELECT 'vm_mktcap_gt0_pe_null',    COUNT(*)::int FROM valuation_metrics WHERE market_cap > 0 AND pe_ratio IS NULL
  `;
  console.log("\n── Row counts ──────────────────────────────");
  for (const r of counts) console.log(`  ${r.tbl.padEnd(30)} ${r.cnt}`);

  // 2. Sample vm rows with market_cap > 0 and pe_ratio IS NULL
  const vmSample = await sql<{ symbol: string; market_cap: string; pe_ratio: string | null }[]>`
    SELECT symbol, market_cap::text, pe_ratio::text
    FROM valuation_metrics
    WHERE market_cap > 0 AND pe_ratio IS NULL
    LIMIT 5
  `;
  console.log("\n── Sample vm rows (market_cap > 0, pe_ratio NULL) ──");
  console.log(vmSample.length ? vmSample : "  none found");

  // 3. Do those symbols exist in financials?
  if (vmSample.length > 0) {
    const syms = vmSample.map((r) => r.symbol);
    const finCheck = await sql<{ symbol: string; period_type: string; revenue: string | null; net_income: string | null }[]>`
      SELECT symbol, period_type, revenue::text, net_income::text
      FROM financials
      WHERE symbol = ANY(${syms})
      LIMIT 20
    `;
    console.log("\n── financials rows for those symbols ──────");
    console.log(finCheck.length ? finCheck : "  *** NO ROWS FOUND — this is the problem ***");
  }

  // 4. Sample of what IS in financials
  const finSample = await sql<{ symbol: string; period_type: string; revenue: string | null }[]>`
    SELECT symbol, period_type, revenue::text
    FROM financials
    ORDER BY period_end_date DESC
    LIMIT 5
  `;
  console.log("\n── Most recent financials rows ─────────────");
  console.log(finSample.length ? finSample : "  financials table is empty");

  await sql.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
