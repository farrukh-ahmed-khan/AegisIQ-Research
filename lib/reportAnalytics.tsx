function buildHistoryAnalytics(history) {
  if (!history || !history.length) {
    return emptyAnalytics();
  }

  const cleaned = history
    .map((row) => ({
      trade_date: row.trade_date,
      open: toNumber(row.open),
      high: toNumber(row.high),
      low: toNumber(row.low),
      close: toNumber(row.close),
      volume: toNumber(row.volume),
    }))
    .filter((row) => row.close !== null);

  if (!cleaned.length) {
    return emptyAnalytics();
  }

  const first = cleaned[0];
  const last = cleaned[cleaned.length - 1];
  const closes = cleaned.map((r) => r.close).filter((n) => n !== null);
  const highs = cleaned.map((r) => r.high).filter((n) => n !== null);
  const lows = cleaned.map((r) => r.low).filter((n) => n !== null);
  const volumes = cleaned.map((r) => r.volume).filter((n) => n !== null);

  const sma20 = movingAverage(closes, 20);
  const sma50 = movingAverage(closes, 50);

  const firstClose = first.close;
  const lastClose = last.close;
  const absoluteChange =
    firstClose !== null && lastClose !== null ? lastClose - firstClose : null;
  const percentChange =
    firstClose && lastClose !== null ? (absoluteChange / firstClose) * 100 : null;

  const dailyReturns = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] && closes[i] !== null) {
      dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
  }

  const volatilityAnnualized = dailyReturns.length
    ? stdDev(dailyReturns) * Math.sqrt(252) * 100
    : null;

  const trend =
    sma20 !== null && sma50 !== null
      ? sma20 > sma50
        ? "Bullish short-term trend"
        : "Bearish short-term trend"
      : "Trend unavailable";

  const pricePosition =
    highs.length && lows.length && lastClose !== null
      ? ((lastClose - Math.min(...lows)) / (Math.max(...highs) - Math.min(...lows))) * 100
      : null;

  const impliedRangeLow = lastClose !== null ? lastClose * 0.9 : null;
  const impliedRangeBase = lastClose !== null ? lastClose * 1.08 : null;
  const impliedRangeHigh = lastClose !== null ? lastClose * 1.18 : null;

  return {
    rows: cleaned.length,
    firstDate: first.trade_date,
    lastDate: last.trade_date,
    firstClose,
    lastClose,
    absoluteChange,
    percentChange,
    highMax: highs.length ? Math.max(...highs) : null,
    lowMin: lows.length ? Math.min(...lows) : null,
    averageVolume: volumes.length
      ? volumes.reduce((a, b) => a + b, 0) / volumes.length
      : null,
    sma20,
    sma50,
    volatilityAnnualized,
    trend,
    pricePosition,
    impliedRangeLow,
    impliedRangeBase,
    impliedRangeHigh,
    investmentView: buildInvestmentView({
      percentChange,
      sma20,
      sma50,
      volatilityAnnualized,
      pricePosition,
    }),
  };
}

function buildInvestmentView({
  percentChange,
  sma20,
  sma50,
  volatilityAnnualized,
  pricePosition,
}) {
  const momentum =
    percentChange === null
      ? "insufficient momentum data"
      : percentChange >= 15
      ? "strong positive price momentum"
      : percentChange >= 0
      ? "moderately positive momentum"
      : "negative recent momentum";

  const trend =
    sma20 !== null && sma50 !== null
      ? sma20 > sma50
        ? "short-term trend is above medium-term trend"
        : "short-term trend is below medium-term trend"
      : "trend data is limited";

  const risk =
    volatilityAnnualized === null
      ? "risk level unavailable"
      : volatilityAnnualized > 45
      ? "high volatility profile"
      : volatilityAnnualized > 25
      ? "moderate volatility profile"
      : "relatively contained volatility";

  const position =
    pricePosition === null
      ? "price-range position unavailable"
      : pricePosition > 75
      ? "trading near the upper end of its observed range"
      : pricePosition < 25
      ? "trading near the lower end of its observed range"
      : "trading near the middle of its observed range";

  return `${momentum}; ${trend}; ${risk}; ${position}.`;
}

function movingAverage(values, window) {
  if (values.length < window) return null;
  const slice = values.slice(values.length - window);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function stdDev(values) {
  if (!values.length) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
    values.length;
  return Math.sqrt(variance);
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function emptyAnalytics() {
  return {
    rows: 0,
    firstDate: null,
    lastDate: null,
    firstClose: null,
    lastClose: null,
    absoluteChange: null,
    percentChange: null,
    highMax: null,
    lowMin: null,
    averageVolume: null,
    sma20: null,
    sma50: null,
    volatilityAnnualized: null,
    trend: "Trend unavailable",
    pricePosition: null,
    impliedRangeLow: null,
    impliedRangeBase: null,
    impliedRangeHigh: null,
    investmentView: "No analytics available.",
  };
}

export {
  buildHistoryAnalytics,
};
