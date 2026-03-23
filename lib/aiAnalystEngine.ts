import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function runAiAnalystEngine({
  request,
  analytics,
  valuation,
  marketData,
  peers,
}) {
  const prompt = `
You are a senior institutional equity research analyst.

Create a structured equity research output for ${request.ticker}.

Return valid JSON with exactly these keys:
{
  "investment_thesis": "...",
  "key_risks": ["...", "...", "..."],
  "catalysts": ["...", "...", "..."],
  "bull_case": "...",
  "base_case": "...",
  "bear_case": "...",
  "recommendation_summary": "..."
}

Use the following context.

Company:
- ticker: ${request.ticker}
- company_name: ${request.company_name || "Unknown"}
- sector: ${request.sector || "Unknown"}
- industry: ${request.industry || "Unknown"}
- exchange: ${request.exchange || "Unknown"}

Market data:
- live_price: ${marketData?.live_price ?? "n/a"}
- price_change_pct: ${marketData?.price_change_pct ?? "n/a"}
- market_cap: ${marketData?.market_cap ?? "n/a"}

Technical / uploaded-history analytics:
- period: ${request.period}
- first_close: ${analytics?.firstClose ?? "n/a"}
- last_close: ${analytics?.lastClose ?? "n/a"}
- percent_change: ${analytics?.percentChange ?? "n/a"}
- volatility_annualized: ${analytics?.volatilityAnnualized ?? "n/a"}
- sma20: ${analytics?.sma20 ?? "n/a"}
- sma50: ${analytics?.sma50 ?? "n/a"}
- trend: ${analytics?.trend ?? "n/a"}
- high_max: ${analytics?.highMax ?? "n/a"}
- low_min: ${analytics?.lowMin ?? "n/a"}

Valuation:
- current_price: ${valuation?.currentPrice ?? "n/a"}
- rating: ${valuation?.rating ?? request.analyst_rating ?? "n/a"}
- target_low: ${valuation?.targetRange?.low ?? request.target_low ?? "n/a"}
- target_base: ${valuation?.targetRange?.base ?? request.target_base ?? "n/a"}
- target_high: ${valuation?.targetRange?.high ?? request.target_high ?? "n/a"}
- upside_percent: ${valuation?.upsidePercent ?? "n/a"}
- valuation_summary: ${valuation?.summary ?? "n/a"}
- dcf_value_per_share: ${valuation?.dcf?.impliedValuePerShare ?? "n/a"}

Peers:
${formatPeers(peers)}

Style rules:
- sound like a professional sell-side analyst
- do not use hype or marketing language
- keep each risk and catalyst concise
- thesis should be 1 paragraph
- recommendation summary should be 1 short paragraph
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a professional institutional equity research analyst producing concise, structured research output in strict JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content || "{}";
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    parsed = {
      investment_thesis: "AI output parsing failed.",
      key_risks: [],
      catalysts: [],
      bull_case: "",
      base_case: "",
      bear_case: "",
      recommendation_summary: "",
    };
  }

  return normalizeAnalystOutput(parsed);
}

function normalizeAnalystOutput(data) {
  return {
    investment_thesis: toText(data.investment_thesis),
    key_risks: toArray(data.key_risks),
    catalysts: toArray(data.catalysts),
    bull_case: toText(data.bull_case),
    base_case: toText(data.base_case),
    bear_case: toText(data.bear_case),
    recommendation_summary: toText(data.recommendation_summary),
  };
}

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 5);
}

function formatPeers(peers) {
  if (!Array.isArray(peers) || !peers.length) return "- no peer data available";
  return peers
    .slice(0, 8)
    .map(
      (p) =>
        `- ${p.peer_ticker || "n/a"} | ${p.peer_name || "n/a"} | ${p.peer_sector || "n/a"} | ${p.peer_industry || "n/a"} | market cap: ${p.peer_market_cap ?? "n/a"}`
    )
    .join("\n");
}

export {
  runAiAnalystEngine,
};
