import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClerkClient } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import {
  getPlanFromPublicMetadata,
  hasActiveSubscriptionFromUserPublicMetadata,
} from "@/lib/subscription-access";
import { AI_REPORT_MONTHLY_LIMIT } from "@/lib/plan-access";

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function getUsageCount(userId: string, month: string): Promise<number> {
  try {
    const rows = await sql<{ count: number }[]>`
      SELECT count FROM ai_report_usage
      WHERE user_id = ${userId} AND month = ${month}
      LIMIT 1
    `;
    if (!rows || rows.length === 0) return 0;
    return Number(rows[0].count) || 0;
  } catch {
    return 0;
  }
}

async function incrementUsageCount(
  userId: string,
  month: string,
): Promise<number> {
  const rows = await sql<{ count: number }[]>`
    INSERT INTO ai_report_usage (user_id, month, count)
    VALUES (${userId}, ${month}, 1)
    ON CONFLICT (user_id, month)
    DO UPDATE SET count = ai_report_usage.count + 1,
                  updated_at = NOW()
    RETURNING count
  `;
  return Number(rows[0]?.count) || 1;
}

// GET /api/reports/check-usage — returns current usage and limit for the caller
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const user = await clerk.users.getUser(userId);
    const planTier = getPlanFromPublicMetadata(user.publicMetadata) || "starter";
    const limit = AI_REPORT_MONTHLY_LIMIT[planTier as keyof typeof AI_REPORT_MONTHLY_LIMIT];

    if (limit === null) {
      return NextResponse.json({
        plan: planTier,
        limit: null,
        used: 0,
        remaining: null,
        unlimited: true,
      });
    }

    const month = getCurrentMonth();
    const used = await getUsageCount(userId, month);

    return NextResponse.json({
      plan: planTier,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      unlimited: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/reports/check-usage — check and increment usage atomically
// Returns 402 with error if limit exceeded, 200 with updated counts if allowed
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const user = await clerk.users.getUser(userId);
    const isActive = hasActiveSubscriptionFromUserPublicMetadata(
      user.publicMetadata,
    );

    if (!isActive) {
      return NextResponse.json(
        { error: "Subscription required" },
        { status: 402 },
      );
    }

    const planTier = getPlanFromPublicMetadata(user.publicMetadata) || "starter";
    const limit = AI_REPORT_MONTHLY_LIMIT[planTier as keyof typeof AI_REPORT_MONTHLY_LIMIT];

    if (limit === null) {
      // Unlimited — Pro/Enterprise
      return NextResponse.json({
        allowed: true,
        plan: planTier,
        limit: null,
        used: null,
        remaining: null,
        unlimited: true,
      });
    }

    const month = getCurrentMonth();
    const currentUsed = await getUsageCount(userId, month);

    if (currentUsed >= limit) {
      return NextResponse.json(
        {
          error: "upgrade_required",
          message: `${currentUsed} of ${limit} AI reports used this month — upgrade to Pro for unlimited access.`,
          plan: planTier,
          limit,
          used: currentUsed,
          remaining: 0,
        },
        { status: 402 },
      );
    }

    const newCount = await incrementUsageCount(userId, month);

    return NextResponse.json({
      allowed: true,
      plan: planTier,
      limit,
      used: newCount,
      remaining: Math.max(0, limit - newCount),
      unlimited: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
