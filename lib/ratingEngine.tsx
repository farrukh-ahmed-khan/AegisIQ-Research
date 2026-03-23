function deriveAnalystRating({
  currentPrice,
  targetPrice,
  percentChange,
  volatilityAnnualized,
  sma20,
  sma50,
}) {
  const price = num(currentPrice);
  const target = num(targetPrice);
  const upside =
    Number.isFinite(price) && price > 0 && Number.isFinite(target)
      ? ((target - price) / price) * 100
      : null;

  let score = 0;

  if (Number.isFinite(upside)) {
    if (upside >= 20) score += 3;
    else if (upside >= 10) score += 2;
    else if (upside >= 0) score += 1;
    else if (upside <= -15) score -= 3;
    else score -= 1;
  }

  if (num(percentChange) > 10) score += 1;
  if (num(percentChange) < -10) score -= 1;

  if (num(sma20) > num(sma50)) score += 1;
  if (num(sma20) < num(sma50)) score -= 1;

  if (num(volatilityAnnualized) > 45) score -= 1;
  if (num(volatilityAnnualized) < 25) score += 1;

  let rating = "Hold";
  if (score >= 4) rating = "Buy";
  else if (score <= -2) rating = "Reduce";

  return {
    rating,
    score,
    upsidePercent: upside,
  };
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export {
  deriveAnalystRating,
};
