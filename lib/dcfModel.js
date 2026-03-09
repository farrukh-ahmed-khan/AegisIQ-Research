function buildSimpleDcf({
  lastClose,
  growthRate = 0.08,
  discountRate = 0.11,
  terminalGrowthRate = 0.025,
  baseCashFlow = null,
}) {
  const referenceCashFlow =
    numberOrNull(baseCashFlow) ??
    (numberOrNull(lastClose) !== null ? numberOrNull(lastClose) * 4 : null);

  if (referenceCashFlow === null) {
    return emptyDcf();
  }

  const years = [];
  let cashFlow = referenceCashFlow;

  for (let year = 1; year <= 5; year++) {
    cashFlow = cashFlow * (1 + growthRate);
    const discounted = cashFlow / Math.pow(1 + discountRate, year);

    years.push({
      year,
      projectedCashFlow: cashFlow,
      discountedCashFlow: discounted,
    });
  }

  const terminalCashFlow = cashFlow * (1 + terminalGrowthRate);
  const terminalValue =
    terminalCashFlow / Math.max(discountRate - terminalGrowthRate, 0.001);

  const discountedTerminalValue = terminalValue / Math.pow(1 + discountRate, 5);

  const enterpriseValue =
    years.reduce((sum, y) => sum + y.discountedCashFlow, 0) +
    discountedTerminalValue;

  return {
    assumptions: {
      growthRate,
      discountRate,
      terminalGrowthRate,
      referenceCashFlow,
    },
    years,
    terminalValue,
    discountedTerminalValue,
    enterpriseValue,
    impliedValuePerShare: enterpriseValue / 10,
  };
}

function emptyDcf() {
  return {
    assumptions: null,
    years: [],
    terminalValue: null,
    discountedTerminalValue: null,
    enterpriseValue: null,
    impliedValuePerShare: null,
  };
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

module.exports = {
  buildSimpleDcf,
};
