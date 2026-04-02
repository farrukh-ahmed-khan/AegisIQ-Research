import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createCampaign } from "@/lib/repositories/investorGrowthCampaignRepository";
import { toStableUuid } from "@/lib/stable-user-id";

type SaveCampaignBody = {
  ticker: string;
  company_name: string;
  campaign_objective: string;
  audience_focus: string;
  tone: string;
  notes: string;
  strategy: string;
  email_draft: string;
  sms_draft: string;
  social_post: string;
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as SaveCampaignBody;

    const requiredFields: Array<keyof SaveCampaignBody> = [
      "ticker",
      "company_name",
      "campaign_objective",
      "audience_focus",
      "tone",
      "notes",
      "strategy",
      "email_draft",
      "sms_draft",
      "social_post",
    ];

    const hasMissingField = requiredFields.some(
      (field) => !body[field]?.trim(),
    );

    if (hasMissingField) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    const campaign = await createCampaign({
      user_id: toStableUuid(userId),
      ticker: body.ticker.trim().toUpperCase(),
      company_name: body.company_name.trim(),
      campaign_objective: body.campaign_objective.trim(),
      audience_focus: body.audience_focus.trim(),
      tone: body.tone.trim(),
      notes: body.notes.trim(),
      strategy: body.strategy.trim(),
      email_draft: body.email_draft.trim(),
      sms_draft: body.sms_draft.trim(),
      social_post: body.social_post.trim(),
    });

    return NextResponse.json({
      id: campaign.id,
      status: campaign.status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save campaign.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
