import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createContact,
  getContactsByUser,
  countContactsByUser,
} from "@/lib/repositories/investorContactRepository";
import { createAuditLog } from "@/lib/repositories/investorGrowthAuditRepository";
import { ensureInvestorGrowthAdvancedSchema } from "@/lib/investor-growth/advancedRepository";
import { toStableUuid } from "@/lib/stable-user-id";

const PER_PAGE = 25;

export async function GET(request: Request) {
  try {
    await ensureInvestorGrowthAdvancedSchema();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stableUserId = toStableUuid(userId);
    const url = new URL(request.url);
    const pageValue = Number(url.searchParams.get("page") ?? "1");
    const page = Math.max(1, pageValue);

    const offset = (page - 1) * PER_PAGE;
    const contacts = await getContactsByUser(stableUserId, PER_PAGE, offset);
    const total = await countContactsByUser(stableUserId);

    return NextResponse.json({
      contacts,
      pagination: {
        page,
        per_page: PER_PAGE,
        total,
        total_pages: Math.ceil(total / PER_PAGE),
      },
    });
  } catch (error) {
    console.error("GET /contacts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureInvestorGrowthAdvancedSchema();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const stableUserId = toStableUuid(userId);

    // Validate required fields
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const contactId = await createContact({
      user_id: stableUserId,
      workspace_id: body.workspace_id ?? null,
      name: body.name.trim(),
      email: body.email?.trim(),
      phone: body.phone?.trim(),
      organization: body.organization?.trim(),
      role: body.role?.trim(),
      investor_type: body.investor_type?.trim(),
      account_name: body.account_name?.trim(),
      relationship_stage: body.relationship_stage?.trim(),
      interest_score:
        typeof body.interest_score === "number" ? body.interest_score : undefined,
      last_engagement_at: body.last_engagement_at?.trim(),
      next_follow_up_at: body.next_follow_up_at?.trim(),
      crm_metadata_json: body.crm_metadata_json,
      tags_json: body.tags_json,
      notes: body.notes?.trim(),
    });

    // Audit log
    await createAuditLog({
      user_id: stableUserId,
      action: "contact_created",
      metadata_json: { contact_id: contactId, name: body.name },
    });

    return NextResponse.json({ id: contactId }, { status: 201 });
  } catch (error) {
    console.error("POST /contacts error:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 },
    );
  }
}
