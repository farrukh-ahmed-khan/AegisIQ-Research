const { buildRealDcfModel } = require("./realDcfModel");
const { deriveAnalystRating } = require("./ratingEngine");

function runValuationEngine({
  ticker,
  analytics,
  marketData,
  financials,
  compsData,
}) {
  const currentPrice =
    toNumber(marketData?.live_price) ?? toNumber(analytics?.lastClose);

  const revenue =
    toNumber(financials?.revenue) ??
    estimateRevenueFromMarketCap(
      toNumber(marketData?.market_cap),
      toNumber(compsData?.averages?.ev_revenue)
    );

  const sharesOutstanding =
    toNumber(financials?.shares_outstanding) ??
    estimateSharesOutstanding(
      toNumber(marketData?.market_cap),
      currentPrice
    );

  const netDebt =
    toNumber(financials?.net_debt) ?? 0;

  const dcf = buildRealDcfModel({
    revenue,
    revenueGrowthRate: toNumber(financials?.revenue_growth_rate) ?? 0.08,
    ebitMargin: toNumber(financials?.ebit_margin) ?? 0.22,
    taxRate: toNumber(financials?.tax_rate) ?? 0.21,
    daPercent: toNumber(financials?.da_percent) ?? 0.04,
    capexPercent: toNumber(financials?.capex_percent) ?? 0.05,
    nwcPercent: toNumber(financials?.nwc_percent) ?? 0.02,
    discountRate: toNumber(financials?.discount_rate) ?? 0.1,
    terminalGrowthRate: toNumber(financials?.terminal_growth_rate) ?? 0.025,
    netDebt,
    sharesOutstanding,
    forecastYears: 5,
  });

  const compsTarget = buildCompsTarget({
    currentPrice,
    marketCap: toNumber(marketData?.market_cap),
    revenue,
    sharesOutstanding,
    averages: compsData?.averages || {},
  });

  const technicalTarget = blendTechnicalTarget({
    currentPrice,
    highMax: toNumber(analytics?.highMax),
    lowMin: toNumber(analytics?.lowMin),
    sma20: toNumber(analytics?.sma20),
    sma50: toNumber(analytics?.sma50),
  });

  const targetLow = averageDefined([
    dcf.impliedValuePerShare ? dcf.impliedValuePerShare * 0.9 : null,
    compsTarget ? compsTarget * 0.9 : null,
    technicalTarget ? technicalTarget * 0.92 : null,
  ]);

  const targetBase = weightedAverage([
    { value: dcf.impliedValuePerShare, weight: 0.5 },
    { value: compsTarget, weight: 0.3 },
    { value: technicalTarget, weight: 0.2 },
  ]);

  const targetHigh = averageDefined([
    dcf.impliedValuePerShare ? dcf.impliedValuePerShare * 1.1 : null,
    compsTarget ? compsTarget * 1.1 : null,
    technicalTarget ? technicalTarget * 1.08 : null,
  ]);

  const ratingResult = deriveAnalystRating({
    currentPrice,
    targetPrice: targetBase,
    percentChange: analytics?.percentChange,
    volatilityAnnualized: analytics?.volatilityAnnualized,
    sma20: analytics?.sma20,
    sma50: analytics?.sma50,
  });

  return {
    ticker,
    currentPrice,
    dcf,
    compsTarget,
    technicalTarget,
    targetRange: {
      low: targetLow,
      base: targetBase,
      high: targetHigh,
    },
    rating: ratingResult.rating,
    ratingScore: ratingResult.score,
    upsidePercent: ratingResult.upsidePercent,
    summary: buildValuationSummary({
      ticker,
      currentPrice,
      dcfValue: dcf.impliedValuePerShare,
      compsTarget,
      technicalTarget,
      targetBase,
      rating: ratingResult.rating,
    }),
  };
}

function buildCompsTarget({ currentPrice, marketCap, revenue, sharesOutstanding, averages }) {
  const evRevenue = toNumber(averages?.ev_revenue);
  const peRatio = toNumber(averages?.pe_ratio);

  const revBased =
    Number.isFinite(revenue) &&
    revenue > 0 &&
    Number.isFinite(sharesOutstanding) &&
    sharesOutstanding > 0 &&
    Number.isFinite(evRevenue)
      ? (revenue * evRevenue) / sharesOutstanding
      : null;

  const earningsProxyPerShare =
    Number.isFinite(currentPrice) ? currentPrice / Math.max(peRatio || 20, 1) : null;

  const peBased =
    Number.isFinite(earningsProxyPerShare) && Number.isFinite(peRatio)
      ? earningsProxyPerShare * peRatio
      : null;

  return averageDefined([revBased, peBased]);
}

function blendTechnicalTarget({ currentPrice, highMax, lowMin, sma20, sma50 }) {
  return averageDefined([
    currentPrice,
    highMax,
    sma20,
    sma50,
    lowMin !== null && highMax !== null ? (lowMin + highMax) / 2 : null,
  ]);
}

function estimateRevenueFromMarketCap(marketCap, evRevenueMultiple) {
  if (!Number.isFinite(marketCap) || marketCap <= 0) return null;
  const multiple = Number.isFinite(evRevenueMultiple) && evRevenueMultiple > 0 ? evRevenueMultiple : 5;
  return marketCap / multiple;
}

function estimateSharesOutstanding(marketCap, price) {
  if (!Number.isFinite(marketCap) || !Number.isFinite(price) || price <= 0) return null;
  return marketCap / price;
}

function buildValuationSummary({
  ticker,
  currentPrice,
  dcfValue,
  compsTarget,
  technicalTarget,
  targetBase,
  rating,
}) {
  return `${ticker} valuation blends DCF (${fmt(dcfValue)}), comparable-company implied value (${fmt(
    compsTarget
  )}), and a technical reference level (${fmt(
    technicalTarget
  )}) into a base target of ${fmt(targetBase)} versus current price ${fmt(
    currentPrice
  )}, resulting in a ${rating} view.`;
}

function weightedAverage(items) {
  let weighted = 0;
  let total = 0;
  for (const item of items) {
    if (Number.isFinite(item.value) && Number.isFinite(item.weight)) {
      weighted += item.value * item.weight;
      total += item.weight;
    }
  }
  return total > 0 ? weighted / total : null;
}

function averageDefined(values) {
  const valid = values.filter((v) => Number.isFinite(v));
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fmt(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "n/a";
  return `$${n.toFixed(2)}`;
}

module.exports = {
  runValuationEngine,
};
