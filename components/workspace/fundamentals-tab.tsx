import type {
  FinancialRecord,
  FundamentalsViewModel,
  RatioRecord,
  ValuationMetricRecord,
} from "../../types/fundamentals";
import styles from "./fundamentals-tab.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

function fmt(n: number | null, options?: Intl.NumberFormatOptions): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", options).format(n);
}

function fmtLarge(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number | null, isRaw = true): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const val = isRaw ? n * 100 : n;
  return `${val.toFixed(2)}%`;
}

function fmtMultiple(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}×`;
}

function fmtDecimal(n: number | null, places = 2): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return n.toFixed(places);
}

function isPositive(n: number | null): boolean {
  return n !== null && n > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean | null;
}) {
  const valueClass =
    positive === true
      ? `${styles.kpiValue} ${styles.positive}`
      : positive === false
        ? `${styles.kpiValue} ${styles.negative}`
        : styles.kpiValue;

  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={valueClass}>{value}</div>
      {sub ? <div className={styles.kpiSub}>{sub}</div> : null}
    </div>
  );
}

function RatioRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean | null;
}) {
  const valueClass =
    positive === true
      ? `${styles.ratioValue} ${styles.positive}`
      : positive === false
        ? `${styles.ratioValue} ${styles.negative}`
        : styles.ratioValue;

  return (
    <div className={styles.ratioRow}>
      <span className={styles.ratioLabel}>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function Card({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h2 className={styles.sectionTitle}>{title}</h2>
          {sub ? <p className={styles.subText}>{sub}</p> : null}
        </div>
      </div>
      <div className={styles.cardBody}>{children}</div>
    </section>
  );
}

function EmptyFundamentals({ symbol }: { symbol: string }) {
  return (
    <div className={styles.emptyState}>
      <p className={styles.emptyTitle}>Fundamentals unavailable for {symbol}</p>
      <p className={styles.emptyBody}>
        Financial data could not be retrieved for this symbol. It may be unlisted, delisted, or not covered by the data provider.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Income Statement KPIs
// ─────────────────────────────────────────────────────────────────────────────

function IncomeSection({ fin }: { fin: FinancialRecord }) {
  return (
    <Card
      title="Income Statement"
      sub={`FY${fin.fiscalYear} · ${fin.periodEndDate} · ${fin.currency}`}
    >
      <div className={styles.kpiGrid}>
        <KpiCard label="Revenue" value={fmtLarge(fin.revenue)} />
        <KpiCard
          label="Gross Profit"
          value={fmtLarge(fin.grossProfit)}
          positive={isPositive(fin.grossProfit) || null}
        />
        <KpiCard
          label="Operating Income"
          value={fmtLarge(fin.operatingIncome)}
          positive={fin.operatingIncome !== null ? fin.operatingIncome > 0 : null}
        />
        <KpiCard label="EBITDA" value={fmtLarge(fin.ebitda)} />
        <KpiCard
          label="Net Income"
          value={fmtLarge(fin.netIncome)}
          positive={fin.netIncome !== null ? fin.netIncome > 0 : null}
        />
        <KpiCard label="EPS (Diluted)" value={fin.epsDiluted !== null ? `$${fmtDecimal(fin.epsDiluted)}` : "—"} />
        <KpiCard label="FCF" value={fmtLarge(fin.freeCashFlow)} positive={fin.freeCashFlow !== null ? fin.freeCashFlow > 0 : null} />
        <KpiCard label="Op. Cash Flow" value={fmtLarge(fin.operatingCashFlow)} />
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Balance Sheet KPIs
// ─────────────────────────────────────────────────────────────────────────────

function BalanceSheetSection({ fin }: { fin: FinancialRecord }) {
  return (
    <Card
      title="Balance Sheet"
      sub={`FY${fin.fiscalYear} · ${fin.periodEndDate}`}
    >
      <div className={styles.kpiGrid}>
        <KpiCard label="Total Assets" value={fmtLarge(fin.totalAssets)} />
        <KpiCard label="Total Liabilities" value={fmtLarge(fin.totalLiabilities)} />
        <KpiCard label="Total Equity" value={fmtLarge(fin.totalEquity)} />
        <KpiCard label="Cash & Equiv." value={fmtLarge(fin.cashAndEquivalents)} />
        <KpiCard label="Total Debt" value={fmtLarge(fin.totalDebt)} />
        <KpiCard
          label="Shares Outstanding"
          value={
            fin.sharesOutstanding !== null
              ? fmt(fin.sharesOutstanding / 1e6, { maximumFractionDigits: 1 }) + "M"
              : "—"
          }
        />
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ratios
// ─────────────────────────────────────────────────────────────────────────────

function RatiosSection({ ratios }: { ratios: RatioRecord }) {
  return (
    <Card
      title="Financial Ratios"
      sub={`FY${ratios.fiscalYear} · ${ratios.source === "derived" ? "Derived from financials" : ratios.source}`}
    >
      <div className={styles.twoCol}>
        <div>
          <p className={styles.subText} style={{ marginBottom: "0.5rem" }}>
            Profitability
          </p>
          <div className={styles.ratioTable}>
            <RatioRow label="Gross Margin" value={fmtPct(ratios.grossMargin)} positive={isPositive(ratios.grossMargin)} />
            <RatioRow label="Operating Margin" value={fmtPct(ratios.operatingMargin)} positive={isPositive(ratios.operatingMargin)} />
            <RatioRow label="Net Margin" value={fmtPct(ratios.netMargin)} positive={isPositive(ratios.netMargin)} />
            <RatioRow label="EBITDA Margin" value={fmtPct(ratios.ebitdaMargin)} positive={isPositive(ratios.ebitdaMargin)} />
            <RatioRow label="FCF Margin" value={fmtPct(ratios.fcfMargin)} positive={isPositive(ratios.fcfMargin)} />
          </div>

          <p className={styles.subText} style={{ marginTop: "1rem", marginBottom: "0.5rem" }}>
            Returns
          </p>
          <div className={styles.ratioTable}>
            <RatioRow label="ROE" value={fmtPct(ratios.roe)} positive={isPositive(ratios.roe)} />
            <RatioRow label="ROA" value={fmtPct(ratios.roa)} positive={isPositive(ratios.roa)} />
            <RatioRow label="ROIC" value={fmtPct(ratios.roic)} positive={isPositive(ratios.roic)} />
          </div>
        </div>

        <div>
          <p className={styles.subText} style={{ marginBottom: "0.5rem" }}>
            Liquidity & Leverage
          </p>
          <div className={styles.ratioTable}>
            <RatioRow label="Current Ratio" value={fmtDecimal(ratios.currentRatio)} />
            <RatioRow label="Quick Ratio" value={fmtDecimal(ratios.quickRatio)} />
            <RatioRow label="Debt / Equity" value={fmtDecimal(ratios.debtToEquity)} />
            <RatioRow label="Interest Coverage" value={fmtDecimal(ratios.interestCoverage)} />
          </div>

          <p className={styles.subText} style={{ marginTop: "1rem", marginBottom: "0.5rem" }}>
            Growth (YoY)
          </p>
          <div className={styles.ratioTable}>
            <RatioRow
              label="Revenue Growth"
              value={fmtPct(ratios.revenueGrowthYoy)}
              positive={ratios.revenueGrowthYoy !== null ? ratios.revenueGrowthYoy > 0 : null}
            />
            <RatioRow
              label="Earnings Growth"
              value={fmtPct(ratios.earningsGrowthYoy)}
              positive={ratios.earningsGrowthYoy !== null ? ratios.earningsGrowthYoy > 0 : null}
            />
            <RatioRow
              label="FCF Growth"
              value={fmtPct(ratios.fcfGrowthYoy)}
              positive={ratios.fcfGrowthYoy !== null ? ratios.fcfGrowthYoy > 0 : null}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Valuation Metrics
// ─────────────────────────────────────────────────────────────────────────────

function ValuationSection({ vm }: { vm: ValuationMetricRecord }) {
  return (
    <Card
      title="Valuation Metrics"
      sub={`As of ${vm.asOfDate} · ${vm.source}`}
    >
      <div className={styles.kpiGrid}>
        <KpiCard label="Market Cap" value={fmtLarge(vm.marketCap)} />
        <KpiCard label="Enterprise Value" value={fmtLarge(vm.enterpriseValue)} />
        <KpiCard label="P/E (TTM)" value={fmtMultiple(vm.peRatio)} />
        <KpiCard label="Forward P/E" value={fmtMultiple(vm.forwardPe)} />
        <KpiCard label="PEG Ratio" value={fmtDecimal(vm.pegRatio)} />
        <KpiCard label="EV / EBITDA" value={fmtMultiple(vm.evToEbitda)} />
        <KpiCard label="EV / Revenue" value={fmtMultiple(vm.evToRevenue)} />
        <KpiCard label="P / Book" value={fmtMultiple(vm.priceToBook)} />
        <KpiCard label="P / Sales" value={fmtMultiple(vm.priceToSales)} />
        <KpiCard label="P / FCF" value={fmtMultiple(vm.priceToFcf)} />
        <KpiCard
          label="Dividend Yield"
          value={fmtPct(vm.dividendYield)}
          positive={isPositive(vm.dividendYield) || null}
        />
        <KpiCard label="Earnings Yield" value={fmtPct(vm.earningsYield)} />
      </div>

      <div className={styles.sourceBadge}>
        Revenue TTM: {fmtLarge(vm.revenueTtm)} &nbsp;·&nbsp; EBITDA TTM:{" "}
        {fmtLarge(vm.ebitdaTtm)} &nbsp;·&nbsp; EPS TTM: $
        {fmtDecimal(vm.epsTtm)} &nbsp;·&nbsp; BV/share: $
        {fmtDecimal(vm.bookValuePerShare)}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Historical P&L table
// ─────────────────────────────────────────────────────────────────────────────

function HistoricalTable({ rows }: { rows: FinancialRecord[] }) {
  if (rows.length === 0) return null;

  return (
    <Card title="Annual History" sub="Last 5 fiscal years · income statement">
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Period</th>
              <th>Revenue</th>
              <th>Gross Profit</th>
              <th>Op. Income</th>
              <th>EBITDA</th>
              <th>Net Income</th>
              <th>EPS (Dil.)</th>
              <th>FCF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>FY{r.fiscalYear}</td>
                <td>{fmtLarge(r.revenue)}</td>
                <td>{fmtLarge(r.grossProfit)}</td>
                <td>{fmtLarge(r.operatingIncome)}</td>
                <td>{fmtLarge(r.ebitda)}</td>
                <td>{fmtLarge(r.netIncome)}</td>
                <td>{r.epsDiluted !== null ? `$${fmtDecimal(r.epsDiluted)}` : "—"}</td>
                <td>{fmtLarge(r.freeCashFlow)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quarterly snapshot table
// ─────────────────────────────────────────────────────────────────────────────

function QuarterlyTable({ rows }: { rows: FinancialRecord[] }) {
  if (rows.length === 0) return null;

  return (
    <Card title="Quarterly Snapshot" sub="Last 8 quarters">
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Quarter</th>
              <th>Revenue</th>
              <th>Gross Profit</th>
              <th>Net Income</th>
              <th>EPS (Dil.)</th>
              <th>FCF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  Q{r.fiscalQuarter ?? "?"} FY{r.fiscalYear}
                </td>
                <td>{fmtLarge(r.revenue)}</td>
                <td>{fmtLarge(r.grossProfit)}</td>
                <td>{fmtLarge(r.netIncome)}</td>
                <td>{r.epsDiluted !== null ? `$${fmtDecimal(r.epsDiluted)}` : "—"}</td>
                <td>{fmtLarge(r.freeCashFlow)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

interface FundamentalsTabProps {
  data: FundamentalsViewModel;
}

export function FundamentalsTab({ data }: FundamentalsTabProps) {
  const hasData =
    data.latestFinancials !== null ||
    data.latestValuationMetrics !== null;

  if (!hasData) {
    return <EmptyFundamentals symbol={data.symbol} />;
  }

  return (
    <div className={styles.section}>
      {data.latestValuationMetrics ? (
        <ValuationSection vm={data.latestValuationMetrics} />
      ) : null}

      {data.latestFinancials ? (
        <IncomeSection fin={data.latestFinancials} />
      ) : null}

      {data.latestRatios ? (
        <RatiosSection ratios={data.latestRatios} />
      ) : null}

      {data.latestFinancials ? (
        <BalanceSheetSection fin={data.latestFinancials} />
      ) : null}

      <HistoricalTable rows={data.annualFinancials} />

      <QuarterlyTable rows={data.quarterlyFinancials} />
    </div>
  );
}
