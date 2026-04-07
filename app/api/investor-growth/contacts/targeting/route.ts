import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { ensureInvestorGrowthAdvancedSchema } from "@/lib/investor-growth/advancedRepository";
import { toStableUuid } from "@/lib/stable-user-id";

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
  const daysAgo =
    (Date.now() - new Date(lastEngagementAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysAgo <= 7) return 100;
  if (daysAgo <= 30) return 75;
  if (daysAgo <= 90) return 40;
  return 10;
}

function compositeScore(row: {
  interest_score: number | null;
  relationship_stage: string | null;
  last_engagement_at: string | null;
}): number {
  const base = Math.min(100, Math.max(0, Number(row.interest_score ?? 0)));
  const stage = stageScore(row.relationship_stage);
  const recency = recencyScore(row.last_engagement_at);
  return Math.round(base * 0.5 + stage * 0.3 + recency * 0.2);
}

type RequestBody = {
  campaign_objective?: string;
  target_investor_type?: string;
  target_relationship_stage?: string;
  tone?: string;
};

export async function POST(request: NextRequest) {
  try {
    await ensureInvestorGrowthAdvancedSchema();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const stableUserId = toStableUuid(userId);
    const body = (await request.json().catch(() => ({}))) as RequestBody;

    // Load all contacts
    const contactRows = await sql<Array<Record<string, unknown>>>`
      SELECT
        id, name, email, organization, role, investor_type,
        account_name, relationship_stage, interest_score, last_engagement_at
      FROM investor_contacts
      WHERE user_id = ${stableUserId}
      ORDER BY interest_score DESC NULLS LAST
    `;

    // Load all segments with member counts
    const segmentRows = await sql<Array<Record<string, unknown>>>`
      SELECT
        s.id, s.name, s.description,
        COUNT(sm.contact_id) AS member_count
      FROM investor_segments s
      LEFT JOIN investor_segment_members sm ON sm.segment_id = s.id
      WHERE s.user_id = ${stableUserId}
      GROUP BY s.id, s.name, s.description
      ORDER BY COUNT(sm.contact_id) DESC
    `;

    // Score every contact
    const scoredContacts = contactRows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      email: row.email ? String(row.email) : null,
      organization: row.organization ? String(row.organization) : null,
      investor_type: row.investor_type ? String(row.investor_type) : null,
      account_name: row.account_name ? String(row.account_name) : null,
      relationship_stage: row.relationship_stage ? String(row.relationship_stage) : "prospect",
      interest_score: Number(row.interest_score ?? 0),
      last_engagement_at: row.last_engagement_at ? String(row.last_engagement_at) : null,
      composite_score: compositeScore({
        interest_score: row.interest_score as number | null,
        relationship_stage: row.relationship_stage as string | null,
        last_engagement_at: row.last_engagement_at as string | null,
      }),
    }));

    scoredContacts.sort((a, b) => b.composite_score - a.composite_score);

    // Apply targeting filters
    let filtered = [...scoredContacts];
    if (body.target_investor_type?.trim()) {
      filtered = filtered.filter((c) =>
        c.investor_type
          ?.toLowerCase()
          .includes(body.target_investor_type!.toLowerCase()),
      );
    }
    if (body.target_relationship_stage?.trim()) {
      filtered = filtered.filter(
        (c) => c.relationship_stage === body.target_relationship_stage,
      );
    }

    const recommendedContacts = filtered.slice(0, 10);

    // Score each segment by avg composite score of its members
    const segmentScores = await Promise.all(
      segmentRows.map(async (seg) => {
        const segId = String(seg.id);
        const memberRows = await sql<Array<{ contact_id: string }>>`
          SELECT contact_id FROM investor_segment_members WHERE segment_id = ${segId}
        `;
        const memberIds = new Set(memberRows.map((m) => m.contact_id));
        const memberContacts = scoredContacts.filter((c) => memberIds.has(c.id));
        const avgScore =
          memberContacts.length > 0
            ? Math.round(
                memberContacts.reduce((sum, c) => sum + c.composite_score, 0) /
                  memberContacts.length,
              )
            : 0;
        const highPriorityCount = memberContacts.filter(
          (c) => c.composite_score >= 75,
        ).length;

        let reason = "General segment with mixed investor profiles.";
        if (avgScore >= 70)
          reason = "High-value segment — strong engagement and relationship scores.";
        else if (avgScore >= 50)
          reason = "Mid-tier segment — active contacts with growth potential.";
        else if (highPriorityCount > 0)
          reason = `Contains ${highPriorityCount} high-priority contact(s) worth targeting individually.`;

        return {
          segment_id: segId,
          segment_name: String(seg.name),
          description: seg.description ? String(seg.description) : null,
          member_count: Number(seg.member_count ?? 0),
          avg_score: avgScore,
          high_priority_count: highPriorityCount,
          recommendation_reason: reason,
        };
      }),
    );

    segmentScores.sort((a, b) => b.avg_score - a.avg_score);

    // Timing and summary hints
    const objectiveKeywords = (body.campaign_objective ?? "").toLowerCase();
    let timingHint =
      "Send in the next business window while contacts are within normal engagement cycles.";
    if (
      objectiveKeywords.includes("urgent") ||
      objectiveKeywords.includes("catalyst")
    ) {
      timingHint =
        "Time-sensitive objective detected — lead with high-priority contacts within 24 hours.";
    } else if (
      objectiveKeywords.includes("roadshow") ||
      objectiveKeywords.includes("event")
    ) {
      timingHint =
        "Event-driven campaign — target relationship-stage contacts first, then active prospects.";
    }

    const topStage = recommendedContacts[0]?.relationship_stage ?? "prospect";
    const typeCounts = scoredContacts.reduce<Record<string, number>>((acc, c) => {
      const t = c.investor_type ?? "unknown";
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {});
    const dominantType =
      Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "mixed";

    return NextResponse.json({
      campaign_objective: body.campaign_objective ?? null,
      recommended_audience: `${topStage} and above, ${dominantType} investor profile`,
      contact_count_in_scope: filtered.length,
      timing_hint: timingHint,
      top_contacts: recommendedContacts,
      top_segments: segmentScores.slice(0, 5),
      audience_breakdown: {
        by_stage: Object.fromEntries(
          Object.entries(STAGE_VALUES).map(([stage]) => [
            stage,
            scoredContacts.filter((c) => c.relationship_stage === stage).length,
          ]),
        ),
        high_priority: scoredContacts.filter((c) => c.composite_score >= 75).length,
        medium_priority: scoredContacts.filter(
          (c) => c.composite_score >= 45 && c.composite_score < 75,
        ).length,
        low_priority: scoredContacts.filter((c) => c.composite_score < 45).length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate targeting recommendations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
