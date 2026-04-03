import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createSegment,
  getSegmentsByUser,
  countSegmentsByUser,
} from "@/lib/repositories/investorSegmentRepository";
import { createAuditLog } from "@/lib/repositories/investorGrowthAuditRepository";
import { toStableUuid } from "@/lib/stable-user-id";

const PER_PAGE = 25;

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stableUserId = toStableUuid(userId);
    const url = new URL(request.url);
    const pageValue = Number(url.searchParams.get("page") ?? "1");
    const page = Math.max(1, pageValue);

    const offset = (page - 1) * PER_PAGE;
    const segments = await getSegmentsByUser(stableUserId, PER_PAGE, offset);
    const total = await countSegmentsByUser(stableUserId);

    return NextResponse.json({
      segments,
      pagination: {
        page,
        per_page: PER_PAGE,
        total,
        total_pages: Math.ceil(total / PER_PAGE),
      },
    });
  } catch (error) {
    console.error("GET /segments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch segments" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
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

    const segmentId = await createSegment({
      user_id: stableUserId,
      workspace_id: body.workspace_id ?? null,
      name: body.name.trim(),
      description: body.description?.trim(),
      rules_json: body.rules_json,
    });

    // Audit log
    await createAuditLog({
      user_id: stableUserId,
      action: "segment_created",
      metadata_json: { segment_id: segmentId, name: body.name },
    });

    return NextResponse.json({ id: segmentId }, { status: 201 });
  } catch (error) {
    console.error("POST /segments error:", error);
    return NextResponse.json(
      { error: "Failed to create segment" },
      { status: 500 },
    );
  }
}
