import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { ensureInvestorGrowthAdvancedSchema } from "@/lib/investor-growth/advancedRepository";
import { toStableUuid } from "@/lib/stable-user-id";

// Composite scoring weights
const WEIGHTS = {
  interest_score: 0.45,      // Base CRM interest score (0-100)
  stage_score: 0.25,         // Relationship stage progression
  engagement_recency: 0.20,  // How recently engaged
  followup_urgency: 0.10,    // Urgency of next follow-up
};

const STAGE_VALUES: Record<string, number> = {
  relationship: 100,
  diligence: 80,
  active: 60,
  prospect: 30,
  dormant: 10,
};

function stageScore(stage: string | null): number {
  return STAGE_VALUES[stage?.toLowerCase() ?? ""] ?? 30;
}

function recencyScore(lastEngagementAt: string | null): number {
  if (!lastEngagementAt) return 0;
  const daysAgo = (Date.now() - new Date(lastEngagementAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysAgo <= 7) return 100;
  if (daysAgo <= 30) return 75;
  if (daysAgo <= 90) return 40;
  if (daysAgo <= 180) return 20;
  return 5;
}

function urgencyScore(nextFollowUpAt: string | null): { score: number; overdue: boolean } {
  if (!nextFollowUpAt) return { score: 0, overdue: false };
  const msUntilDue = new Date(nextFollowUpAt).getTime() - Date.now();
  const daysUntilDue = msUntilDue / (1000 * 60 * 60 * 24);
  const overdue = daysUntilDue < 0;
  let score = 0;
  if (overdue) score = 100;
  else if (daysUntilDue <= 1) score = 90;
  else if (daysUntilDue <= 3) score = 70;
  else if (daysUntilDue <= 7) score = 50;
  else if (daysUntilDue <= 14) score = 30;
  else score = 10;
  return { score, overdue };
}

function compositeScore(row: {
  interest_score: number | null;
  relationship_stage: string | null;
  last_engagement_at: string | null;
  next_follow_up_at: string | null;
}): { composite: number; breakdown: Record<string, number>; overdue_followup: boolean } {
  const base = Math.min(100, Math.max(0, Number(row.interest_score ?? 0)));
  const stage = stageScore(row.relationship_stage);
  const recency = recencyScore(row.last_engagement_at);
  const { score: urgency, overdue } = urgencyScore(row.next_follow_up_at);

  const composite = Math.round(
    base * WEIGHTS.interest_score +
    stage * WEIGHTS.stage_score +
    recency * WEIGHTS.engagement_recency +
    urgency * WEIGHTS.followup_urgency,
  );

  return {
    composite,
    breakdown: {
      interest_score_weighted: Math.round(base * WEIGHTS.interest_score),
      stage_weighted: Math.round(stage * WEIGHTS.stage_score),
      recency_weighted: Math.round(recency * WEIGHTS.engagement_recency),
      urgency_weighted: Math.round(urgency * WEIGHTS.followup_urgency),
    },
    overdue_followup: overdue,
  };
}

function priorityLabel(score: number): string {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export async function GET(request: Request) {
  try {
    await ensureInvestorGrowthAdvancedSchema();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const stableUserId = toStableUuid(userId);
    const url = new URL(request.url);
    const stage = url.searchParams.get("stage");
    const priority = url.searchParams.get("priority");
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "50")));

    const rows = await sql<Array<Record<string, unknown>>>`
      SELECT
        id, name, email, phone, organization, role, investor_type,
        account_name, relationship_stage, interest_score,
        last_engagement_at, next_follow_up_at, notes, created_at
      FROM investor_contacts
      WHERE user_id = ${stableUserId}
        ${stage ? sql`AND relationship_stage = ${stage}` : sql``}
      ORDER BY interest_score DESC NULLS LAST, created_at DESC
      LIMIT ${limit}
    `;

    const scored = rows.map((row) => {
      const { composite, breakdown, overdue_followup } = compositeScore({
        interest_score: row.interest_score as number | null,
        relationship_stage: row.relationship_stage as string | null,
        last_engagement_at: row.last_engagement_at as string | null,
        next_follow_up_at: row.next_follow_up_at as string | null,
      });

      return {
        id: String(row.id),
        name: String(row.name),
        email: row.email ? String(row.email) : null,
        phone: row.phone ? String(row.phone) : null,
        organization: row.organization ? String(row.organization) : null,
        role: row.role ? String(row.role) : null,
        investor_type: row.investor_type ? String(row.investor_type) : null,
        account_name: row.account_name ? String(row.account_name) : null,
        relationship_stage: row.relationship_stage ? String(row.relationship_stage) : "prospect",
        interest_score: Number(row.interest_score ?? 0),
        last_engagement_at: row.last_engagement_at ? String(row.last_engagement_at) : null,
        next_follow_up_at: row.next_follow_up_at ? String(row.next_follow_up_at) : null,
        notes: row.notes ? String(row.notes) : null,
        created_at: String(row.created_at),
        // Scoring
        composite_score: composite,
        score_breakdown: breakdown,
        priority: priorityLabel(composite),
        overdue_followup,
      };
    });

    // Sort by composite score descending
    scored.sort((a, b) => b.composite_score - a.composite_score);

    // Apply priority filter if requested
    const filtered = priority ? scored.filter((c) => c.priority === priority) : scored;

    // Portfolio-level insights
    const highPriority = scored.filter((c) => c.priority === "high").length;
    const mediumPriority = scored.filter((c) => c.priority === "medium").length;
    const lowPriority = scored.filter((c) => c.priority === "low").length;
    const overdueFollowups = scored.filter((c) => c.overdue_followup).length;
    const avgScore = scored.length > 0
      ? Math.round(scored.reduce((sum, c) => sum + c.composite_score, 0) / scored.length)
      : 0;

    // Account-level rollup (group by account_name)
    const accountMap: Record<string, { count: number; avg_score: number; top_contact: string; total_score: number }> = {};
    for (const contact of scored) {
      const account = contact.account_name ?? contact.organization ?? "Unknown";
      if (!accountMap[account]) {
        accountMap[account] = { count: 0, avg_score: 0, top_contact: contact.name, total_score: 0 };
      }
      accountMap[account].count++;
      accountMap[account].total_score += contact.composite_score;
    }
    const accountRanking = Object.entries(accountMap)
      .map(([account, data]) => ({
        account,
        contact_count: data.count,
        avg_composite_score: Math.round(data.total_score / data.count),
        top_contact: data.top_contact,
      }))
      .sort((a, b) => b.avg_composite_score - a.avg_composite_score)
      .slice(0, 20);

    return NextResponse.json({
      contacts: filtered,
      account_ranking: accountRanking,
      summary: {
        total: scored.length,
        high_priority: highPriority,
        medium_priority: mediumPriority,
        low_priority: lowPriority,
        overdue_followups: overdueFollowups,
        avg_composite_score: avgScore,
      },
      scoring_model: {
        weights: WEIGHTS,
        stage_values: STAGE_VALUES,
        description: "Composite score = interest_score (45%) + relationship stage (25%) + engagement recency (20%) + follow-up urgency (10%)",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to compute contact scoring.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
