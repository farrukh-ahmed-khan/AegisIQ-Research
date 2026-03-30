import { NextRequest, NextResponse } from "next/server";
import { bulkUpsertFundamentals } from "../../../../lib/fundamentals-repository";
import type {
  UpsertFinancialInput,
  UpsertRatioInput,
  UpsertValuationMetricInput,
} from "../../../../types/fundamentals";

/**
 * POST /api/admin/fundamentals
 *
 * Protected by x-load-token header (same pattern as load-security-master).
 * Body: { financials?: [...], ratios?: [...], valuationMetrics?: [...] }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("x-load-token");
    const expectedToken = process.env.SECURITY_MASTER_LOAD_TOKEN;

    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as {
      financials?: UpsertFinancialInput[];
      ratios?: UpsertRatioInput[];
      valuationMetrics?: UpsertValuationMetricInput[];
    };

    if (
      !Array.isArray(body.financials ?? []) ||
      !Array.isArray(body.ratios ?? []) ||
      !Array.isArray(body.valuationMetrics ?? [])
    ) {
      return NextResponse.json(
        { error: "Body must contain arrays for financials, ratios, and/or valuationMetrics." },
        { status: 400 },
      );
    }

    const result = await bulkUpsertFundamentals({
      financials: body.financials,
      ratios: body.ratios,
      valuationMetrics: body.valuationMetrics,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("POST /api/admin/fundamentals failed", error);
    return NextResponse.json(
      { error: "Failed to load fundamentals data." },
      { status: 500 },
    );
  }
}
