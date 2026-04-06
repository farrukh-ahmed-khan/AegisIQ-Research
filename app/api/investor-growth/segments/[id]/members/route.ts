import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getSegmentById,
  addContactToSegment,
  removeContactFromSegment,
} from "@/lib/repositories/investorSegmentRepository";
import { getContactById } from "@/lib/repositories/investorContactRepository";
import { createAuditLog } from "@/lib/repositories/investorGrowthAuditRepository";
import { toStableUuid } from "@/lib/stable-user-id";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stableUserId = toStableUuid(userId);
    const body = await request.json();
    const { id } = await context.params;

    // Validate input
    if (!body.contact_id) {
      return NextResponse.json(
        { error: "contact_id is required" },
        { status: 400 },
      );
    }

    // Check segment ownership
    const segment = await getSegmentById(id);
    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    if (segment.user_id !== stableUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check contact ownership
    const contact = await getContactById(body.contact_id);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    if (contact.user_id !== stableUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const memberId = await addContactToSegment(id, body.contact_id);

    // Audit log
    await createAuditLog({
      user_id: stableUserId,
      action: "segment_member_added",
      metadata_json: {
        segment_id: id,
        contact_id: body.contact_id,
      },
    });

    return NextResponse.json({ id: memberId }, { status: 201 });
  } catch (error) {
    console.error("POST /segments/[id]/members error:", error);
    return NextResponse.json(
      { error: "Failed to add contact to segment" },
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
    const body = await request.json();
    const { id } = await context.params;

    // Validate input
    if (!body.contact_id) {
      return NextResponse.json(
        { error: "contact_id is required" },
        { status: 400 },
      );
    }

    // Check segment ownership
    const segment = await getSegmentById(id);
    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    if (segment.user_id !== stableUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await removeContactFromSegment(id, body.contact_id);

    // Audit log
    await createAuditLog({
      user_id: stableUserId,
      action: "segment_member_removed",
      metadata_json: {
        segment_id: id,
        contact_id: body.contact_id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /segments/[id]/members error:", error);
    return NextResponse.json(
      { error: "Failed to remove contact from segment" },
      { status: 500 },
    );
  }
}
