/**
 * fill-derived-ratios.ts
 *
 * Fills NULL valuation ratio columns (pe_ratio, price_to_book, price_to_sales,
 * ev_to_ebitda, ev_to_revenue, price_to_fcf, earnings_yield) by computing them
 * from data already stored in the DB — no FMP API calls needed.
 *
 * Uses: market_cap from valuation_metrics + financials (latest annual row).
 *
 * Usage:
 *   npx tsx scripts/fill-derived-ratios.ts
 */

import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  console.log("Computing derived valuation ratios from stored financials…\n");

  // Step 1: fill enterprise_value where missing
  const evResult = await sql.unsafe(`
    UPDATE valuation_metrics vm
    SET
      enterprise_value = vm.market_cap + f.total_debt - f.cash_and_equivalents,
      updated_at = NOW()
    FROM (
      SELECT DISTINCT ON (symbol)
        symbol, total_debt, cash_and_equivalents
      FROM financials
      WHERE period_type = 'annual'
        AND total_debt           IS NOT NULL
        AND cash_and_equivalents IS NOT NULL
      ORDER BY symbol, period_end_date DESC NULLS LAST
    ) f
    WHERE vm.symbol              = f.symbol
      AND vm.market_cap          > 0
      AND vm.enterprise_value   IS NULL
  `);
  console.log(`  enterprise_value  filled: ${(evResult as unknown as { count: number }).count ?? "?"} rows`);

  // Step 2: fill all ratio columns in one pass
  const ratioResult = await sql.unsafe(`
    UPDATE valuation_metrics vm
    SET
      pe_ratio = CASE
        WHEN vm.pe_ratio IS NULL AND f.net_income > 0
        THEN vm.market_cap / f.net_income
        ELSE vm.pe_ratio
      END,

      price_to_book = CASE
        WHEN vm.price_to_book IS NULL AND f.total_equity > 0
        THEN vm.market_cap / f.total_equity
        ELSE vm.price_to_book
      END,

      price_to_sales = CASE
        WHEN vm.price_to_sales IS NULL AND f.revenue > 0
        THEN vm.market_cap / f.revenue
        ELSE vm.price_to_sales
      END,

      ev_to_ebitda = CASE
        WHEN vm.ev_to_ebitda IS NULL
          AND COALESCE(vm.enterprise_value, vm.market_cap) > 0
          AND f.ebitda > 0
        THEN COALESCE(vm.enterprise_value, vm.market_cap) / f.ebitda
        ELSE vm.ev_to_ebitda
      END,

      ev_to_revenue = CASE
        WHEN vm.ev_to_revenue IS NULL
          AND COALESCE(vm.enterprise_value, vm.market_cap) > 0
          AND f.revenue > 0
        THEN COALESCE(vm.enterprise_value, vm.market_cap) / f.revenue
        ELSE vm.ev_to_revenue
      END,

      price_to_fcf = CASE
        WHEN vm.price_to_fcf IS NULL AND f.free_cash_flow > 0
        THEN vm.market_cap / f.free_cash_flow
        ELSE vm.price_to_fcf
      END,

      earnings_yield = CASE
        WHEN vm.earnings_yield IS NULL AND f.net_income > 0
        THEN f.net_income / vm.market_cap
        ELSE vm.earnings_yield
      END,

      updated_at = NOW()

    FROM (
      SELECT DISTINCT ON (symbol)
        symbol,
        net_income,
        revenue,
        ebitda,
        total_equity,
        total_debt,
        cash_and_equivalents,
        free_cash_flow
      FROM financials
      WHERE period_type = 'annual'
      ORDER BY symbol, period_end_date DESC NULLS LAST
    ) f

    WHERE vm.symbol      = f.symbol
      AND vm.market_cap  > 0
      AND (
        vm.pe_ratio       IS NULL OR
        vm.price_to_book  IS NULL OR
        vm.price_to_sales IS NULL OR
        vm.ev_to_ebitda   IS NULL
      )
  `);
  console.log(`  ratios            filled: ${(ratioResult as unknown as { count: number }).count ?? "?"} rows`);

  // Step 3: also fill ratios table revenue_growth, earnings_growth from financials
  // (these are stored in ratios table, not here — skip)

  // Summary
  const summary = await sql<{ total: number; has_pe: number; has_pb: number; has_ps: number }[]>`
    SELECT
      COUNT(*)::int                                        AS total,
      COUNT(*) FILTER (WHERE pe_ratio IS NOT NULL)::int    AS has_pe,
      COUNT(*) FILTER (WHERE price_to_book IS NOT NULL)::int AS has_pb,
      COUNT(*) FILTER (WHERE price_to_sales IS NOT NULL)::int AS has_ps
    FROM valuation_metrics
  `;

  const s = summary[0];
  console.log(`\nvaluation_metrics summary:`);
  console.log(`  total rows : ${s.total}`);
  console.log(`  with P/E   : ${s.has_pe}`);
  console.log(`  with P/B   : ${s.has_pb}`);
  console.log(`  with P/S   : ${s.has_ps}`);
  console.log(`\nDone.`);

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
