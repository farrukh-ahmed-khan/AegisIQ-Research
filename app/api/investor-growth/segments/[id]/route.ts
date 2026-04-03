import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getSegmentById,
  updateSegment,
  deleteSegment,
  getSegmentMembers,
  getSegmentMemberContacts,
  countSegmentMembers,
  addContactToSegment,
  removeContactFromSegment,
} from "@/lib/repositories/investorSegmentRepository";
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
    const segment = await getSegmentById(id);

    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    if (segment.user_id !== stableUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    await updateSegment(id, {
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      description:
        typeof body.description === "string"
          ? body.description.trim()
          : undefined,
      rules_json: body.rules_json,
    });

    // Audit log
    await createAuditLog({
      user_id: stableUserId,
      action: "segment_updated",
      metadata_json: { segment_id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /segments/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update segment" },
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
    const segment = await getSegmentById(id);

    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    if (segment.user_id !== stableUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteSegment(id);

    // Audit log
    await createAuditLog({
      user_id: stableUserId,
      action: "segment_deleted",
      metadata_json: { segment_id: id, name: segment.name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /segments/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete segment" },
      { status: 500 },
    );
  }
}

// Segment members management
export async function GET(
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
    const segment = await getSegmentById(id);

    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    if (segment.user_id !== stableUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await getSegmentMembers(id);
    const memberCount = await countSegmentMembers(id);
    const contacts = await getSegmentMemberContacts(id);

    return NextResponse.json({
      segment,
      members,
      memberCount,
      contacts,
    });
  } catch (error) {
    console.error("GET /segments/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch segment details" },
      { status: 500 },
    );
  }
}
