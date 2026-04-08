export type SendInvestorGrowthSmsInput = {
  to: string;
  body: string;
};

export type SendInvestorGrowthSmsResult = {
  messageId: string | null;
  provider: "twilio";
  rawResponse: unknown;
};

export function getInvestorGrowthSmsConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
  const fromPhone = process.env.TWILIO_FROM_PHONE?.trim() ?? "";

  return {
    accountSid,
    authToken,
    fromPhone,
  };
}

export function hasInvestorGrowthSmsConfig() {
  const { accountSid, authToken, fromPhone } = getInvestorGrowthSmsConfig();
  return Boolean(accountSid && authToken && fromPhone);
}

export async function sendInvestorGrowthSms(
  input: SendInvestorGrowthSmsInput,
): Promise<SendInvestorGrowthSmsResult> {
  const { accountSid, authToken, fromPhone } = getInvestorGrowthSmsConfig();

  if (!accountSid || !authToken || !fromPhone) {
    throw new Error(
      "Twilio SMS is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE.",
    );
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const body = new URLSearchParams({
    To: input.to,
    From: fromPhone,
    Body: input.body,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  const rawResponse = (await response.json().catch(() => ({}))) as {
    sid?: string;
    message?: string;
    code?: number;
  };

  if (!response.ok) {
    throw new Error(
      rawResponse.message || "Failed to send SMS through Twilio.",
    );
  }

  return {
    messageId: rawResponse.sid ?? null,
    provider: "twilio",
    rawResponse,
  };
}
