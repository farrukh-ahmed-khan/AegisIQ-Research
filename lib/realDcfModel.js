function buildRealDcfModel({
  revenue = null,
  revenueGrowthRate = 0.08,
  ebitMargin = 0.22,
  taxRate = 0.21,
  daPercent = 0.04,
  capexPercent = 0.05,
  nwcPercent = 0.02,
  discountRate = 0.1,
  terminalGrowthRate = 0.025,
  netDebt = 0,
  sharesOutstanding = 1000000000,
  forecastYears = 5,
}) {
  const baseRevenue = toNumber(revenue);
  const shares = toNumber(sharesOutstanding);

  if (!Number.isFinite(baseRevenue) || !Number.isFinite(shares) || shares <= 0) {
    return emptyDcf();
  }

  const forecast = [];
  let currentRevenue = baseRevenue;

  for (let year = 1; year <= forecastYears; year++) {
    currentRevenue = currentRevenue * (1 + revenueGrowthRate);

    const ebit = currentRevenue * ebitMargin;
    const nopat = ebit * (1 - taxRate);
    const depreciation = currentRevenue * daPercent;
    const capex = currentRevenue * capexPercent;
    const deltaNwc = currentRevenue * nwcPercent;
    const freeCashFlow = nopat + depreciation - capex - deltaNwc;
    const discountFactor = Math.pow(1 + discountRate, year);
    const discountedFcf = freeCashFlow / discountFactor;

    forecast.push({
      year,
      revenue: currentRevenue,
      ebit,
      nopat,
      depreciation,
      capex,
      deltaNwc,
      freeCashFlow,
      discountFactor,
      discountedFcf,
    });
  }

  const terminalYearFcf = forecast[forecast.length - 1].freeCashFlow * (1 + terminalGrowthRate);
  const terminalValue =
    terminalYearFcf / Math.max(discountRate - terminalGrowthRate, 0.001);
  const discountedTerminalValue =
    terminalValue / Math.pow(1 + discountRate, forecastYears);

  const enterpriseValue =
    forecast.reduce((sum, row) => sum + row.discountedFcf, 0) +
    discountedTerminalValue;

  const equityValue = enterpriseValue - toNumber(netDebt || 0);
  const impliedValuePerShare = equityValue / shares;

  return {
    assumptions: {
      baseRevenue,
      revenueGrowthRate,
      ebitMargin,
      taxRate,
      daPercent,
      capexPercent,
      nwcPercent,
      discountRate,
      terminalGrowthRate,
      netDebt,
      sharesOutstanding: shares,
      forecastYears,
    },
    forecast,
    terminalYearFcf,
    terminalValue,
    discountedTerminalValue,
    enterpriseValue,
    equityValue,
    impliedValuePerShare,
  };
}

function emptyDcf() {
  return {
    assumptions: null,
    forecast: [],
    terminalYearFcf: null,
    terminalValue: null,
    discountedTerminalValue: null,
    enterpriseValue: null,
    equityValue: null,
    impliedValuePerShare: null,
  };
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

module.exports = {
  buildRealDcfModel,
};
