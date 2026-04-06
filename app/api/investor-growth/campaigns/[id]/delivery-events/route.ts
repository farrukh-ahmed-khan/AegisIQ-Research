import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignById } from "@/lib/repositories/investorGrowthCampaignRepository";
import { getDeliveryEventsByCampaign } from "@/lib/repositories/investorDeliveryRepository";
import { toStableUuid } from "@/lib/stable-user-id";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function readRecordValue(
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

    const stableUserId = toStableUuid(userId);
    const { id } = await context.params;
    const campaign = await getCampaignById(id);

    if (!campaign || campaign.user_id !== stableUserId) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 },
      );
    }

    const events = await getDeliveryEventsByCampaign(id);

    return NextResponse.json({
      delivery_events: events.map((event) => ({
        id: event.id,
        channel: event.channel,
        recipient:
          readRecordValue(event.recipient_payload_json, "email") ||
          readRecordValue(event.recipient_payload_json, "to"),
        recipient_name: readRecordValue(event.recipient_payload_json, "name"),
        subject: readRecordValue(event.content_payload_json, "subject"),
        body: readRecordValue(event.content_payload_json, "body"),
        status: event.delivery_status,
        provider:
          readRecordValue(event.provider_response_json, "provider") || "resend",
        provider_message_id: event.provider_message_id ?? null,
        error: event.error_message ?? null,
        timestamp: event.created_at,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load delivery history.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
