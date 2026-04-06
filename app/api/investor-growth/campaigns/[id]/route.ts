import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getCampaignById,
  updateCampaign,
} from "@/lib/repositories/investorGrowthCampaignRepository";
import { createAuditLog } from "@/lib/repositories/investorGrowthAuditRepository";
import { toStableUuid } from "@/lib/stable-user-id";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PatchBody = {
  email_subject?: string;
  email_body?: string;
  sms_body?: string;
  social_post?: string;
  notes?: string;
  segment_id?: string | null;
};

function readContentValue(
  payload: Record<string, unknown> | undefined,
  key: string,
): string {
  const value = payload?.[key];
  return typeof value === "string" ? value : "";
}

function mapCampaignResponse(campaign: {
  id: string;
  ticker?: string;
  company_name?: string;
  campaign_objective?: string;
  status: string;
  email_delivery_status: string;
  email_sent_at?: string | null;
  email_provider_message_id?: string | null;
  email_last_error?: string | null;
  audience_focus?: string;
  tone?: string;
  notes?: string;
  strategy_payload_json?: Record<string, unknown>;
  email_subject?: string;
  email_body?: string;
  sms_body?: string;
  social_post?: string;
  segment_id?: string | null;
  created_at: string;
}) {
  const strategy = readContentValue(campaign.strategy_payload_json, "strategy");

  return {
    id: campaign.id,
    ticker: campaign.ticker ?? "",
    company_name: campaign.company_name ?? "",
    campaign_objective: campaign.campaign_objective ?? "",
    status: campaign.status,
    approval_status:
      campaign.status === "approved" || campaign.status === "sent"
        ? "approved"
        : campaign.status,
    email_delivery_status: campaign.email_delivery_status,
    email_sent_at: campaign.email_sent_at ?? null,
    provider_message_id: campaign.email_provider_message_id ?? null,
    last_error: campaign.email_last_error ?? null,
    audience_focus: campaign.audience_focus ?? "",
    tone: campaign.tone ?? "",
    notes: campaign.notes ?? "",
    strategy: strategy || "",
    email_subject: campaign.email_subject ?? "",
    email_draft: campaign.email_body ?? "",
    sms_draft: campaign.sms_body ?? "",
    social_post: campaign.social_post ?? "",
    segment_id: campaign.segment_id ?? null,
    created_at: campaign.created_at,
  };
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await context.params;
    const campaign = await getCampaignById(id);

    if (!campaign || campaign.user_id !== toStableUuid(userId)) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(mapCampaignResponse(campaign));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch campaign details.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await getCampaignById(id);

    if (!existing || existing.user_id !== toStableUuid(userId)) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 },
      );
    }

    const body = (await request.json()) as PatchBody;
    const stableUserId = toStableUuid(userId);

    const updated = await updateCampaign(id, {
      email_subject: body.email_subject?.trim(),
      email_body: body.email_body?.trim(),
      sms_body: body.sms_body?.trim(),
      social_post: body.social_post?.trim(),
      notes: body.notes?.trim(),
      segment_id: body.segment_id,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 },
      );
    }

    // Audit log
    await createAuditLog({
      user_id: stableUserId,
      campaign_id: id,
      action: "campaign_updated",
      metadata_json: {
        campaign_id: id,
        segment_id: body.segment_id,
      },
    });

    return NextResponse.json(mapCampaignResponse(updated));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update campaign.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
