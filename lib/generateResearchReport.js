const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateResearchReport({ ticker, analytics }) {
  const prompt = `
You are an institutional equity research analyst.

Stock: ${ticker}

Analytics Summary:
Return: ${analytics.percentChange}%
Volatility: ${analytics.volatilityAnnualized}%
Trend: ${analytics.trend}
Range Position: ${analytics.pricePosition}%

Generate sections:

1. Investment Thesis
2. Key Risks
3. Catalysts
4. Analyst View
5. Price Target Rationale

Write like a professional equity research report.
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
