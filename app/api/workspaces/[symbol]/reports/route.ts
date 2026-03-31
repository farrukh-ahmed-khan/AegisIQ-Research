import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  completeWorkspaceReportRun,
  createWorkspaceReportRun,
  deleteWorkspaceReports,
  failWorkspaceReportRun,
  getWorkspaceReports,
} from "../../../../../lib/workspace-repository";
import { getFundamentalsViewModel } from "../../../../../lib/fundamentals-repository";
import { runValuationEngine } from "../../../../../lib/valuationEngine";
import { buildComparableSet } from "../../../../../lib/compsModel";
import { sql } from "../../../../../lib/db";
import { hasOpenAiKey } from "../../../../../lib/openai";

interface RouteContext {
  params: Promise<{
    symbol: string;
  }>;
}

interface GenerateReportBody {
  reportType?: unknown;
  notes?: unknown;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function isValidSymbol(symbol: string): boolean {
  return /^[A-Z0-9.\-]{1,12}$/.test(symbol);
}

function isDatabaseConnectivityError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: unknown; errno?: unknown; message?: unknown };
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const errno = typeof candidate.errno === "string" ? candidate.errno : "";
  const message =
    typeof candidate.message === "string" ? candidate.message : "";

  return (
    code === "CONNECT_TIMEOUT" ||
    errno === "CONNECT_TIMEOUT" ||
    message.includes("CONNECT_TIMEOUT")
  );
}

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { symbol: rawSymbol } = await context.params;
  const symbol = normalizeSymbol(rawSymbol);

  if (!isValidSymbol(symbol)) {
    return NextResponse.json({ error: "Invalid symbol." }, { status: 400 });
  }

  const reports = await getWorkspaceReports(userId, symbol);

  return NextResponse.json({ reports });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { symbol: rawSymbol } = await context.params;
  const symbol = normalizeSymbol(rawSymbol);

  if (!isValidSymbol(symbol)) {
    return NextResponse.json({ error: "Invalid symbol." }, { status: 400 });
  }

  const deletedCount = await deleteWorkspaceReports(userId, symbol);

  return NextResponse.json({ deletedCount });
}

function asNumberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value: number | null | undefined): string {
  if (!isPresentNumber(value)) {
    return "n/a";
  }

  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number | null | undefined): string {
  if (!isPresentNumber(value)) {
    return "n/a";
  }

  return `${value.toFixed(2)}%`;
}

function isPresentNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseNarrativeSections(narrative: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const normalized = narrative.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return sections;
  }

  const matches = Array.from(
    normalized.matchAll(/(?:^|\n)(\d+)\.\s+([^\n:]+):\s*/g),
  );

  if (!matches.length) {
    sections.full = normalized;
    return sections;
  }

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    const title = current[2].trim().toLowerCase();
    const start = current.index! + current[0].length;
    const end = next ? next.index : normalized.length;
    sections[title] = normalized.slice(start, end).trim();
  }

  sections.full = normalized;

  return sections;
}

function buildFallbackAnalystOutput(params: {
  symbol: string;
  companyName: string;
  rating: string;
  baseTarget: number | null;
  currentPrice: number | null;
  upsidePercent: number | null;
}): {
  investment_thesis: string;
  key_risks: string[];
  catalysts: string[];
  bull_case: string;
  base_case: string;
  bear_case: string;
  recommendation_summary: string;
} {
  const baseTargetText =
    params.baseTarget !== null ? `$${params.baseTarget.toFixed(2)}` : "n/a";
  const currentPriceText =
    params.currentPrice !== null ? `$${params.currentPrice.toFixed(2)}` : "n/a";
  const upsideText =
    params.upsidePercent !== null
      ? `${params.upsidePercent.toFixed(2)}%`
      : "n/a";

  return {
    investment_thesis: `${params.companyName} (${params.symbol}) currently screens at a ${params.rating} profile based on stored fundamentals and valuation metrics, with current price ${currentPriceText} and a base target near ${baseTargetText} (implied upside ${upsideText}).`,
    key_risks: [
      "Fundamentals coverage may be incomplete for latest period updates.",
      "Valuation assumptions are model-based and sensitive to discount/growth inputs.",
      "Comparable set is currently a framework placeholder and should be validated.",
    ],
    catalysts: [
      "Upcoming earnings prints and guidance updates.",
      "Margin trajectory versus historical trend and peer set.",
      "Balance-sheet and cash-flow execution across the next few quarters.",
    ],
    bull_case:
      "Execution and growth remain above implied assumptions, supporting target expansion.",
    base_case:
      "Current valuation assumptions hold with stable execution and moderate growth.",
    bear_case:
      "Growth decelerates and margins compress, reducing fair value expectations.",
    recommendation_summary: `Fallback analyst workflow (no OpenAI key) indicates a ${params.rating} stance; add OPENAI_API_KEY to enable full AI narrative generation.`,
  };
}

function buildFallbackNarrative(params: {
  symbol: string;
  rating: string;
  baseTarget: number | null;
  currentPrice: number | null;
  upsidePercent: number | null;
}): string {
  const baseTargetText =
    params.baseTarget !== null ? `$${params.baseTarget.toFixed(2)}` : "n/a";
  const currentPriceText =
    params.currentPrice !== null ? `$${params.currentPrice.toFixed(2)}` : "n/a";
  const upsideText =
    params.upsidePercent !== null
      ? `${params.upsidePercent.toFixed(2)}%`
      : "n/a";

  return [
    `1. Investment Thesis: ${params.symbol} screens at a ${params.rating} setup using stored fundamentals and the current valuation model blend.`,
    "2. Key Risks: Data timeliness, assumption sensitivity, and peer-set representativeness.",
    "3. Catalysts: Earnings results, updated guidance, and cash-flow conversion trend.",
    `4. Analyst View: Current price ${currentPriceText} versus base target ${baseTargetText} (${upsideText} implied).`,
    "5. Price Target Rationale: Weighted valuation from DCF, comps proxy, and technical reference levels.",
    "6. DCF Takeaway: Fair value is primarily driven by long-term margin and discount-rate assumptions.",
    "7. Comparable Company Takeaway: Multiples context supports reasonableness checks, not final conviction alone.",
    `8. Final Recommendation: ${params.rating}.`,
    "",
    "Note: This is a deterministic fallback narrative because OPENAI_API_KEY is not configured.",
  ].join("\n");
}

export async function POST(request: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { symbol: rawSymbol } = await context.params;
  const symbol = normalizeSymbol(rawSymbol);

  if (!isValidSymbol(symbol)) {
    return NextResponse.json({ error: "Invalid symbol." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as GenerateReportBody;
  const reportType =
    typeof body.reportType === "string" && body.reportType.trim()
      ? body.reportType.trim()
      : "equity_research";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  let reportRun:
    | {
        id: string;
      }
    | null = null;
  let persistenceWarning: string | null = null;

  try {
    try {
      reportRun = await createWorkspaceReportRun(userId, symbol, {
        reportType,
        inputPayload: {
          symbol,
          notes,
          initiatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (!isDatabaseConnectivityError(error)) {
        throw error;
      }

      persistenceWarning =
        "Report generated without saving to workspace history because the database connection timed out.";
      console.error(
        `Workspace report persistence unavailable for ${symbol}; continuing without DB-backed history.`,
        error,
      );
    }

    const [fundamentals, securityRows] = await Promise.all([
      getFundamentalsViewModel(symbol),
      sql<
        {
          symbol: string;
          company_name: string | null;
          exchange: string | null;
          sector: string | null;
          industry: string | null;
        }[]
      >`
        SELECT symbol, company_name, exchange, sector, industry
        FROM securities
        WHERE symbol = ${symbol}
        LIMIT 1
      `,
    ]);

    const security = securityRows[0] ?? null;

    const latestFinancials = fundamentals.latestFinancials;
    const latestRatios = fundamentals.latestRatios;
    const latestValuationMetrics = fundamentals.latestValuationMetrics;

    const currentPriceFromMarketCap =
      isPresentNumber(latestValuationMetrics?.marketCap) &&
      isPresentNumber(latestFinancials?.sharesOutstanding) &&
      latestFinancials.sharesOutstanding > 0
        ? latestValuationMetrics.marketCap / latestFinancials.sharesOutstanding
        : null;

    const netDebt =
      isPresentNumber(latestFinancials?.totalDebt) &&
      isPresentNumber(latestFinancials?.cashAndEquivalents)
        ? latestFinancials.totalDebt - latestFinancials.cashAndEquivalents
        : (latestFinancials?.totalDebt ?? null);

    const currentPrice =
      currentPriceFromMarketCap ??
      latestValuationMetrics?.bookValuePerShare ??
      latestValuationMetrics?.epsTtm ??
      null;

    const analytics = {
      percentChange: null,
      volatilityAnnualized: null,
      trend: "Stored fundamentals workflow",
      pricePosition: null,
      lastClose: currentPrice,
      sma20: null,
      sma50: null,
      highMax: currentPrice,
      lowMin: currentPrice,
    };

    const comps = buildComparableSet({
      ticker: symbol,
      lastClose: currentPrice ?? undefined,
    });

    const valuation = runValuationEngine({
      ticker: symbol,
      analytics,
      marketData: {
        live_price: currentPrice,
        market_cap: latestValuationMetrics?.marketCap ?? null,
      },
      financials: {
        revenue: latestFinancials?.revenue ?? null,
        shares_outstanding: latestFinancials?.sharesOutstanding ?? null,
        net_debt: netDebt,
        revenue_growth_rate: latestRatios?.revenueGrowthYoy ?? 0.08,
        ebit_margin: latestRatios?.operatingMargin ?? 0.2,
        tax_rate: 0.21,
        da_percent: 0.04,
        capex_percent: 0.05,
        nwc_percent: 0.02,
        discount_rate: 0.1,
        terminal_growth_rate: 0.025,
      },
      compsData: {
        averages: comps.averages,
        peers: comps.comps,
      },
    });

    let analyst:
      | {
          investment_thesis: string;
          key_risks: string[];
          catalysts: string[];
          bull_case: string;
          base_case: string;
          bear_case: string;
          recommendation_summary: string;
        }
      | undefined;

    let generatedNarrative = "";

    if (hasOpenAiKey()) {
      const [{ runAiAnalystEngine }, { generateResearchReport }] =
        await Promise.all([
          import("../../../../../lib/aiAnalystEngine"),
          import("../../../../../lib/generateResearchReport"),
        ]);

      analyst = await runAiAnalystEngine({
        request: {
          ticker: symbol,
          company_name: security?.company_name,
          sector: security?.sector,
          industry: security?.industry,
          exchange: security?.exchange,
          period: "stored_fundamentals",
        },
        analytics,
        valuation,
        marketData: {
          live_price: currentPrice,
          price_change_pct: null,
          market_cap: latestValuationMetrics?.marketCap ?? null,
        },
        peers: comps.comps.map((peer) => ({
          peer_ticker: peer.ticker,
          peer_name: peer.company_name,
          peer_sector: security?.sector,
          peer_industry: security?.industry,
          peer_market_cap: peer.market_cap,
        })),
      });

      generatedNarrative = await generateResearchReport({
        ticker: symbol,
        analytics,
        dcf: valuation.dcf,
        comps,
        valuation,
      });
    } else {
      analyst = buildFallbackAnalystOutput({
        symbol,
        companyName: security?.company_name ?? symbol,
        rating: valuation.rating,
        baseTarget:
          typeof valuation.targetRange?.base === "number"
            ? valuation.targetRange.base
            : null,
        currentPrice:
          typeof valuation.currentPrice === "number"
            ? valuation.currentPrice
            : null,
        upsidePercent:
          typeof valuation.upsidePercent === "number"
            ? valuation.upsidePercent
            : null,
      });

      generatedNarrative = buildFallbackNarrative({
        symbol,
        rating: valuation.rating,
        baseTarget:
          typeof valuation.targetRange?.base === "number"
            ? valuation.targetRange.base
            : null,
        currentPrice:
          typeof valuation.currentPrice === "number"
            ? valuation.currentPrice
            : null,
        upsidePercent:
          typeof valuation.upsidePercent === "number"
            ? valuation.upsidePercent
            : null,
      });
    }

    const reportDate = new Date().toISOString().slice(0, 10);
    const parsedNarrative = parseNarrativeSections(generatedNarrative);

    const pdfPayload = {
      companyName: security?.company_name ?? symbol,
      ticker: symbol,
      exchange: security?.exchange,
      sector: security?.sector,
      industry: security?.industry,
      reportDate,
      reportTitle: `${symbol} AI Research Report`,
      reportSubtitle: "Generated from stored fundamentals and valuation data",
      rating: valuation.rating,
      score: asNumberOrNull(valuation.ratingScore),
      currentPrice: asNumberOrNull(valuation.currentPrice),
      priceTarget: asNumberOrNull(valuation.targetRange?.base),
      upside: asNumberOrNull(valuation.upsidePercent),
      executiveSummaryText: analyst.investment_thesis,
      executiveSummaryBlocks: [
        {
          heading: "Investment Thesis",
          body:
            parsedNarrative["investment thesis"] ?? analyst.investment_thesis,
        },
        {
          heading: "Analyst View",
          body:
            parsedNarrative["analyst view"] ??
            `Current price ${formatCurrency(valuation.currentPrice)} versus base target ${formatCurrency(valuation.targetRange?.base)} with implied upside of ${formatPercent(valuation.upsidePercent)}.`,
        },
        {
          heading: "Recommendation",
          body: analyst.recommendation_summary,
        },
      ],
      overviewDescription:
        security?.company_name && security?.sector && security?.industry
          ? `${security.company_name} operates in the ${security.sector} sector and ${security.industry} industry, and this report combines stored fundamentals, valuation outputs, and AI-generated analyst interpretation.`
          : `${symbol} is evaluated using stored fundamentals, valuation outputs, and AI-generated analyst interpretation.`,
      investmentThesisText:
        parsedNarrative["investment thesis"] ?? analyst.investment_thesis,
      valuationSummaryText: valuation.summary,
      financialModelNarrative:
        parsedNarrative["dcf takeaway"] ??
        "The DCF framework is anchored on stored revenue, margin, and discount-rate assumptions.",
      valuationNarrative:
        parsedNarrative["price target rationale"] ??
        parsedNarrative["comparable company takeaway"] ??
        valuation.summary,
      technicalNarrative:
        parsedNarrative["analyst view"] ??
        `The current framework is based primarily on stored fundamentals rather than live technical indicators.`,
      conclusionText: analyst.recommendation_summary,
      thesisBullets: [
        {
          title: "Bull Case",
          text: analyst.bull_case,
        },
        {
          title: "Base Case",
          text: analyst.base_case,
        },
        {
          title: "Bear Case",
          text: analyst.bear_case,
        },
      ],
      growthCatalysts: analyst.catalysts,
      thesis: generatedNarrative,
      riskFactors: analyst.key_risks,
      valuationScenarios: [
        {
          name: "Bear Case",
          value: formatCurrency(valuation.targetRange?.low ?? null),
          description: analyst.bear_case,
        },
        {
          name: "Base Case",
          value: formatCurrency(valuation.targetRange?.base ?? null),
          description: analyst.base_case,
        },
        {
          name: "Bull Case",
          value: formatCurrency(valuation.targetRange?.high ?? null),
          description: analyst.bull_case,
        },
      ],
      analystLabel: "AegisIQ AI Analyst",
      firmName: "AegisIQ Research",
      distributionLabel:
        "This report is generated for institutional-style research workflows and should be validated before external distribution.",
      disclaimerText:
        "This AI-generated report is for informational purposes only and does not constitute investment advice or a solicitation to buy or sell securities.",
      disclosureText:
        "Outputs are generated from stored fundamentals, model assumptions, and OpenAI-authored narrative summaries. Users should independently verify all assumptions and conclusions.",
      analystCertificationText:
        "This report was produced through the AegisIQ AI analyst workflow and should be reviewed by a qualified analyst before use in any regulated context.",
      dashboardMetrics: [
        { label: "Rating", value: valuation.rating },
        {
          label: "Current Price",
          value: formatCurrency(valuation.currentPrice),
        },
        {
          label: "Base Target",
          value: formatCurrency(valuation.targetRange?.base ?? null),
        },
        {
          label: "Upside",
          value: formatPercent(valuation.upsidePercent),
        },
      ],
      companyMetrics: [
        { label: "Company", value: security?.company_name ?? symbol },
        { label: "Exchange", value: security?.exchange ?? "n/a" },
        { label: "Sector", value: security?.sector ?? "n/a" },
        { label: "Industry", value: security?.industry ?? "n/a" },
      ],
      valuationMetrics: [
        {
          label: "Market Cap",
          value: latestValuationMetrics?.marketCap ?? "n/a",
        },
        {
          label: "P/E",
          value: latestValuationMetrics?.peRatio ?? "n/a",
        },
        {
          label: "EV/EBITDA",
          value: latestValuationMetrics?.evToEbitda ?? "n/a",
        },
        {
          label: "P/B",
          value: latestValuationMetrics?.priceToBook ?? "n/a",
        },
      ],
      modelMetrics: [
        {
          label: "Revenue Growth",
          value: formatPercent(latestRatios?.revenueGrowthYoy ?? null),
        },
        {
          label: "Operating Margin",
          value: formatPercent(latestRatios?.operatingMargin ?? null),
        },
        {
          label: "DCF Value/Share",
          value: formatCurrency(valuation.dcf?.impliedValuePerShare ?? null),
        },
        {
          label: "Net Debt",
          value: formatCurrency(netDebt),
        },
      ],
      peerTable: comps.comps.slice(0, 6).map((peer) => ({
        Ticker: peer.ticker ?? "n/a",
        Company: peer.company_name ?? "n/a",
        "EV/Revenue": peer.ev_revenue ?? "n/a",
        "EV/EBITDA": peer.ev_ebitda ?? "n/a",
        "P/E": peer.pe_ratio ?? "n/a",
      })),
      valuationTable: [
        {
          Metric: "Current Price",
          Value: formatCurrency(valuation.currentPrice),
        },
        {
          Metric: "Low Target",
          Value: formatCurrency(valuation.targetRange?.low ?? null),
        },
        {
          Metric: "Base Target",
          Value: formatCurrency(valuation.targetRange?.base ?? null),
        },
        {
          Metric: "High Target",
          Value: formatCurrency(valuation.targetRange?.high ?? null),
        },
        {
          Metric: "Upside",
          Value: formatPercent(valuation.upsidePercent),
        },
        {
          Metric: "Rating",
          Value: valuation.rating,
        },
      ],
    };

    const pdfUrl = reportRun
      ? `/api/workspaces/${encodeURIComponent(symbol)}/reports/${reportRun.id}/pdf`
      : null;

    const completedRun = reportRun
      ? await completeWorkspaceReportRun(userId, symbol, reportRun.id, {
          pdfUrl,
          latestRating: valuation.rating,
          latestTargetPrice:
            typeof valuation.targetRange?.base === "number"
              ? valuation.targetRange.base
              : null,
          outputPayload: {
            symbol,
            reportDate,
            fundamentals,
            valuation,
            analyst,
            generatedNarrative,
            pdfPayload,
          },
        })
      : null;

    return NextResponse.json({
      report: completedRun,
      analyst,
      valuation,
      narrative: generatedNarrative,
      pdfUrl,
      warning: persistenceWarning,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate AI report.";

    if (reportRun) {
      try {
        await failWorkspaceReportRun(userId, symbol, reportRun.id, message);
      } catch (failError) {
        console.error(
          `Failed to mark report run as failed for ${symbol}.`,
          failError,
        );
      }
    }

    return NextResponse.json(
      { error: message, reportRunId: reportRun?.id ?? null },
      { status: 500 },
    );
  }
}
