import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getFundamentalsViewModel } from "../../../../lib/fundamentals-repository";

interface RouteContext {
  params: Promise<{ symbol: string }>;
}

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { symbol: rawSymbol } = await context.params;
  const symbol = rawSymbol.trim().toUpperCase();

  if (!/^[A-Z0-9.\-]{1,12}$/.test(symbol)) {
    return NextResponse.json({ error: "Invalid symbol." }, { status: 400 });
  }

  try {
    const data = await getFundamentalsViewModel(symbol);
    return NextResponse.json(data);
  } catch (error) {
    console.error(`GET /api/fundamentals/${symbol} failed`, error);
    return NextResponse.json(
      { error: "Failed to load fundamentals." },
      { status: 500 },
    );
  }
}
