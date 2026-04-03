import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getContactById,
  updateContact,
  deleteContact,
} from "@/lib/repositories/investorContactRepository";
import { createAuditLog } from "@/lib/repositories/investorGrowthAuditRepository";
import { toStableUuid } from "@/lib/stable-user-id";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
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
