import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignById } from "@/lib/repositories/investorCampaignRepository";
import { toStableUuid } from "@/lib/stable-user-id";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function readContentValue(
  payload: Record<string, unknown> | undefined,
  key: string,
): string {
  const value = payload?.[key];
  return typeof value === "string" ? value : "";
}

export async function GET(_: Request, context: RouteContext) {
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

    const strategy = readContentValue(
      campaign.content_payload_json,
      "strategy",
    );
    const emailDraft = readContentValue(
      campaign.content_payload_json,
      "email_draft",
    );
    const smsDraft = readContentValue(
      campaign.content_payload_json,
      "sms_draft",
    );
    const socialPost = readContentValue(
      campaign.content_payload_json,
      "social_post",
    );

    return NextResponse.json({
      id: campaign.id,
      ticker: campaign.ticker ?? "",
      company_name: campaign.company_name ?? "",
      campaign_objective: campaign.campaign_objective ?? "",
      audience_focus: campaign.audience_focus ?? "",
      tone: campaign.tone ?? "",
      notes: campaign.notes ?? "",
      strategy: strategy || "",
      email_draft: emailDraft || campaign.email_body || "",
      sms_draft: smsDraft || campaign.sms_body || "",
      social_post: socialPost || campaign.social_post || "",
      created_at: campaign.created_at,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch campaign details.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
