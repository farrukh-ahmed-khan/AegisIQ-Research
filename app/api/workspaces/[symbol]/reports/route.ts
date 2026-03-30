import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  completeWorkspaceReportRun,
  createWorkspaceReportRun,
  failWorkspaceReportRun,
  getWorkspaceReports,
} from "../../../../../lib/workspace-repository";
import { getFundamentalsViewModel } from "../../../../../lib/fundamentals-repository";
import { runValuationEngine } from "../../../../../lib/valuationEngine";
import { buildComparableSet } from "../../../../../lib/compsModel";
import { sql } from "../../../../../lib/db";

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

function asNumberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

  const reportRun = await createWorkspaceReportRun(userId, symbol, {
    reportType,
    inputPayload: {
      symbol,
      notes,
      initiatedAt: new Date().toISOString(),
    },
  });

  try {
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
      latestValuationMetrics?.marketCap !== null &&
      latestFinancials?.sharesOutstanding !== null &&
      latestFinancials?.sharesOutstanding
        ? latestValuationMetrics.marketCap / latestFinancials.sharesOutstanding
        : null;

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
        net_debt:
          latestFinancials?.totalDebt !== null &&
          latestFinancials?.cashAndEquivalents !== null
            ? latestFinancials.totalDebt - latestFinancials.cashAndEquivalents
            : (latestFinancials?.totalDebt ?? null),
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

    const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY?.trim());

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

    if (hasOpenAiKey) {
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
      valuationSummaryText: valuation.summary,
      conclusionText: analyst.recommendation_summary,
      thesisBullets: analyst.catalysts,
      riskFactors: analyst.key_risks,
      analystLabel: "AegisIQ AI Analyst",
      firmName: "AegisIQ Research",
      dashboardMetrics: [
        { label: "Rating", value: valuation.rating },
        {
          label: "Current Price",
          value:
            valuation.currentPrice !== null
              ? `$${Number(valuation.currentPrice).toFixed(2)}`
              : "n/a",
        },
        {
          label: "Base Target",
          value:
            valuation.targetRange?.base !== null
              ? `$${Number(valuation.targetRange.base).toFixed(2)}`
              : "n/a",
        },
        {
          label: "Upside",
          value:
            valuation.upsidePercent !== null
              ? `${Number(valuation.upsidePercent).toFixed(2)}%`
              : "n/a",
        },
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
    };

    const pdfUrl = `/api/workspaces/${encodeURIComponent(symbol)}/reports/${reportRun.id}/pdf`;

    const completedRun = await completeWorkspaceReportRun(
      userId,
      symbol,
      reportRun.id,
      {
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
      },
    );

    return NextResponse.json({
      report: completedRun,
      analyst,
      valuation,
      narrative: generatedNarrative,
      pdfUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate AI report.";

    await failWorkspaceReportRun(userId, symbol, reportRun.id, message);

    return NextResponse.json(
      { error: message, reportRunId: reportRun.id },
      { status: 500 },
    );
  }
}
