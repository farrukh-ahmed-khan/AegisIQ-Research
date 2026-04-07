import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  ensureInvestorGrowthAdvancedSchema,
  listCalendarExecutionsByUser,
} from "@/lib/investor-growth/advancedRepository";
import { toStableUuid } from "@/lib/stable-user-id";

export async function GET() {
  try {
    await ensureInvestorGrowthAdvancedSchema();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const items = await listCalendarExecutionsByUser(toStableUuid(userId));

    return NextResponse.json({
      items: items.filter((item) => item.channel === "social"),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load social calendar.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
