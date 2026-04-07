import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getContactById,
  updateContact,
  deleteContact,
} from "@/lib/repositories/investorContactRepository";
import { createAuditLog } from "@/lib/repositories/investorGrowthAuditRepository";
import { ensureInvestorGrowthAdvancedSchema } from "@/lib/investor-growth/advancedRepository";
import { toStableUuid } from "@/lib/stable-user-id";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    await ensureInvestorGrowthAdvancedSchema();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stableUserId = toStableUuid(userId);
    const { id } = await context.params;
    const contact = await getContactById(id);

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    if (contact.user_id !== stableUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error("GET /contacts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    await ensureInvestorGrowthAdvancedSchema();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stableUserId = toStableUuid(userId);
    const { id } = await context.params;
    const contact = await getContactById(id);

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    if (contact.user_id !== stableUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    await updateContact(id, {
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      email: typeof body.email === "string" ? body.email.trim() : undefined,
      phone: typeof body.phone === "string" ? body.phone.trim() : undefined,
      organization:
        typeof body.organization === "string"
          ? body.organization.trim()
          : undefined,
      role: typeof body.role === "string" ? body.role.trim() : undefined,
      investor_type:
        typeof body.investor_type === "string"
          ? body.investor_type.trim()
          : undefined,
      account_name:
        typeof body.account_name === "string"
          ? body.account_name.trim()
          : undefined,
      relationship_stage:
        typeof body.relationship_stage === "string"
          ? body.relationship_stage.trim()
          : undefined,
      interest_score:
        typeof body.interest_score === "number" ? body.interest_score : undefined,
      last_engagement_at:
        typeof body.last_engagement_at === "string"
          ? body.last_engagement_at.trim()
          : undefined,
      next_follow_up_at:
        typeof body.next_follow_up_at === "string"
          ? body.next_follow_up_at.trim()
          : undefined,
      crm_metadata_json: body.crm_metadata_json,
      tags_json: body.tags_json,
      notes: typeof body.notes === "string" ? body.notes.trim() : undefined,
    });

    // Audit log
    await createAuditLog({
      user_id: stableUserId,
      action: "contact_updated",
      metadata_json: { contact_id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /contacts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    await ensureInvestorGrowthAdvancedSchema();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stableUserId = toStableUuid(userId);
    const { id } = await context.params;
    const contact = await getContactById(id);

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    if (contact.user_id !== stableUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteContact(id);

    // Audit log
    await createAuditLog({
      user_id: stableUserId,
      action: "contact_deleted",
      metadata_json: { contact_id: id, name: contact.name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /contacts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 },
    );
  }
}
