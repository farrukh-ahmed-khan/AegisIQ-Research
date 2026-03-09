const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateResearchReport({ ticker, analytics, dcf, comps }) {
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

Stock: ${ticker}

Analytics Summary:
- Period return: ${analytics.percentChange}%
- Annualized volatility: ${analytics.volatilityAnnualized}%
- Trend: ${analytics.trend}
- Range position: ${analytics.pricePosition}%
- Last close: ${analytics.lastClose}
- SMA20: ${analytics.sma20}
- SMA50: ${analytics.sma50}

DCF Summary:
- Enterprise value: ${dcf.enterpriseValue}
- Implied value per share: ${dcf.impliedValuePerShare}
- Growth rate: ${dcf.assumptions?.growthRate}
- Discount rate: ${dcf.assumptions?.discountRate}

Comparable Company Summary:
- Average EV/Revenue: ${comps.averages.ev_revenue}
- Average EV/EBITDA: ${comps.averages.ev_ebitda}
- Average P/E: ${comps.averages.pe_ratio}

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

module.exports = {
  generateResearchReport,
};
