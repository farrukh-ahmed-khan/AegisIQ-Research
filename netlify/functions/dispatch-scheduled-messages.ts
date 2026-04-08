import { neon } from "@neondatabase/serverless";

type ScheduledExecution = {
  id: string;
  campaign_id: string;
  user_id: string;
  channel: string;
  platform: string | null;
  draft_content: string | null;
  scheduled_for: string;
  metadata_json: Record<string, unknown> | null;
};

async function sendSms(to: string, body: string): Promise<string | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
  const fromPhone = process.env.TWILIO_FROM_PHONE?.trim() ?? "";

  if (!accountSid || !authToken || !fromPhone) {
    throw new Error("Twilio is not configured.");
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const params = new URLSearchParams({ To: to, From: fromPhone, Body: body });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );

  const json = (await response.json().catch(() => ({}))) as {
    sid?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(json.message ?? "Twilio send failed.");
  }

  return json.sid ?? null;
}

async function postToFacebook(message: string): Promise<string | null> {
  const pageId = process.env.FACEBOOK_PAGE_ID?.trim() ?? "";
  const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim() ?? "";

  if (!pageId || !pageAccessToken) {
    throw new Error("Facebook is not configured.");
  }

  const params = new URLSearchParams({ message, access_token: pageAccessToken });

  const response = await fetch(
    `https://graph.facebook.com/v23.0/${pageId}/feed`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    },
  );

  const json = (await response.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(json.error?.message ?? "Facebook post failed.");
  }

  return json.id ?? null;
}

export const handler = async function () {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("Missing DATABASE_URL.");
    return { statusCode: 500, body: "Missing DATABASE_URL" };
  }

  const sql = neon(databaseUrl);

  // Fetch all due scheduled executions
  const rows = await sql(
    `SELECT id, campaign_id, user_id, channel, platform, draft_content, scheduled_for, metadata_json
     FROM investor_growth_channel_executions
     WHERE delivery_status = 'scheduled'
       AND scheduled_for IS NOT NULL
       AND scheduled_for <= NOW()
     ORDER BY scheduled_for ASC
     LIMIT 50`,
  ) as unknown as ScheduledExecution[];

  if (rows.length === 0) {
    console.log("No due scheduled messages.");
    return { statusCode: 200, body: "No due messages" };
  }

  console.log(`Processing ${rows.length} due scheduled message(s)...`);

  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    let providerMessageId: string | null = null;
    let deliveryStatus = "sent";
    let errorMessage: string | null = null;

    try {
      const content = row.draft_content ?? "";

      if (row.channel === "sms" && row.platform === "twilio") {
        const meta = row.metadata_json ?? {};
        const phone = typeof meta.recipient_phone === "string" ? meta.recipient_phone : "";

        if (!phone) {
          throw new Error("No recipient_phone in metadata_json.");
        }

        providerMessageId = await sendSms(phone, content);
      } else if (row.channel === "social" && row.platform === "facebook") {
        providerMessageId = await postToFacebook(content);
      } else {
        // Other channels (manual SMS, LinkedIn, etc.) — mark sent as logged-only
        console.log(`Marking ${row.channel}/${row.platform} execution ${row.id} as sent (logged-only).`);
      }

      console.log(`Sent ${row.channel}/${row.platform} execution ${row.id}`);
      sent++;
    } catch (err) {
      deliveryStatus = "failed";
      errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Failed execution ${row.id}: ${errorMessage}`);
      failed++;
    }

    // Update the execution record
    await sql(
      `UPDATE investor_growth_channel_executions
       SET delivery_status = $1,
           provider_message_id = COALESCE($2, provider_message_id),
           updated_at = NOW()
       WHERE id = $3`,
      [deliveryStatus, providerMessageId, row.id],
    );

    // Insert a delivery event
    await sql(
      `INSERT INTO investor_growth_delivery_events
         (id, campaign_id, user_id, channel, recipient_payload_json, content_payload_json,
          delivery_status, provider_message_id, provider_response_json, error_message,
          triggered_at, created_at)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4::jsonb, $5::jsonb,
               $6, $7, $8::jsonb, $9, NOW(), NOW())`,
      [
        row.campaign_id,
        row.user_id,
        row.channel,
        JSON.stringify(row.metadata_json ?? {}),
        JSON.stringify({ body: row.draft_content }),
        deliveryStatus,
        providerMessageId,
        JSON.stringify({ provider: row.platform, error: errorMessage }),
        errorMessage,
      ],
    );

    // Audit log
    await sql(
      `INSERT INTO investor_growth_audit_log
         (id, user_id, campaign_id, action, metadata_json, created_at)
       VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4::jsonb, NOW())`,
      [
        row.user_id,
        row.campaign_id,
        deliveryStatus === "sent"
          ? `campaign_${row.channel}_sent`
          : `campaign_${row.channel}_failed`,
        JSON.stringify({
          execution_id: row.id,
          channel: row.channel,
          platform: row.platform,
          scheduled_for: row.scheduled_for,
          provider_message_id: providerMessageId,
          error: errorMessage,
        }),
      ],
    );
  }

  console.log(`Dispatch complete — sent: ${sent}, failed: ${failed}`);
  return {
    statusCode: 200,
    body: JSON.stringify({ sent, failed }),
  };
};
