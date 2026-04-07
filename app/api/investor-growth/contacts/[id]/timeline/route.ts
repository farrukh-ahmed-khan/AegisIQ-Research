import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContactById } from "@/lib/repositories/investorContactRepository";
import {
  createContactTimelineEntry,
  ensureInvestorGrowthAdvancedSchema,
  getContactTimeline,
  updateContactCrm,
} from "@/lib/investor-growth/advancedRepository";
import { toStableUuid } from "@/lib/stable-user-id";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    await ensureInvestorGrowthAdvancedSchema();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const stableUserId = toStableUuid(userId);
    const { id } = await context.params;
    const contact = await getContactById(id);

    if (!contact || contact.user_id !== stableUserId) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }

    const timeline = await getContactTimeline(id);

    return NextResponse.json({ timeline });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load contact timeline.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await ensureInvestorGrowthAdvancedSchema();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const stableUserId = toStableUuid(userId);
    const { id } = await context.params;
    const contact = await getContactById(id);

    if (!contact || contact.user_id !== stableUserId) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      entry_type?: string;
      title?: string;
      note?: string;
      due_at?: string;
      relationship_stage?: string;
      interest_score?: number;
      next_follow_up_at?: string;
      account_name?: string;
    };

    const entry = await createContactTimelineEntry({
      contact_id: id,
      user_id: stableUserId,
      entry_type: body.entry_type?.trim() || "note",
      title: body.title?.trim() || "Timeline entry",
      note: body.note?.trim() || null,
      due_at: body.due_at?.trim() || null,
      metadata_json: {},
    });

    await updateContactCrm(id, {
      relationship_stage: body.relationship_stage ?? contact.relationship_stage ?? null,
      interest_score:
        typeof body.interest_score === "number"
          ? body.interest_score
          : contact.interest_score ?? null,
      next_follow_up_at: body.next_follow_up_at ?? contact.next_follow_up_at ?? null,
      account_name: body.account_name ?? contact.account_name ?? null,
      last_engagement_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update contact timeline.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
