import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateResearchReport({ ticker, analytics, dcf, comps, valuation }) {
  const prompt = `
You are an institutional equity research analyst.

Create a concise but professional report with these sections:

1. Investment Thesis
2. Key Risks
3. Catalysts
4. Analyst View
5. Price Target Rationale
6. DCF Takeaway
7. Comparable Company Takeaway
8. Final Recommendation

Stock: ${ticker}

Market / Technical Summary:
- Period return: ${analytics.percentChange}%
- Annualized volatility: ${analytics.volatilityAnnualized}%
- Trend: ${analytics.trend}
- Range position: ${analytics.pricePosition}%
- Last close: ${analytics.lastClose}
- SMA20: ${analytics.sma20}
- SMA50: ${analytics.sma50}

DCF Summary:
- Enterprise value: ${dcf.enterpriseValue}
- Equity value: ${dcf.equityValue}
- Implied value per share: ${dcf.impliedValuePerShare}
- Revenue growth rate: ${dcf.assumptions?.revenueGrowthRate}
- EBIT margin: ${dcf.assumptions?.ebitMargin}
- Discount rate: ${dcf.assumptions?.discountRate}
- Terminal growth: ${dcf.assumptions?.terminalGrowthRate}

Comparable Company Summary:
- Average EV/Revenue: ${comps.averages.ev_revenue}
- Average EV/EBITDA: ${comps.averages.ev_ebitda}
- Average P/E: ${comps.averages.pe_ratio}

Valuation Blend:
- Current price: ${valuation.currentPrice}
- Low target: ${valuation.targetRange.low}
- Base target: ${valuation.targetRange.base}
- High target: ${valuation.targetRange.high}
- Upside: ${valuation.upsidePercent}
- Rating: ${valuation.rating}

Write like a professional equity research note, not marketing copy.
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: "You are a professional sell-side equity research analyst.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return completion.choices[0].message.content;
}

export {
  generateResearchReport,
};
