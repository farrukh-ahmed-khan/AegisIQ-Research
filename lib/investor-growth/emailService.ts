export type SendInvestorGrowthEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export type SendInvestorGrowthEmailResult = {
  messageId: string | null;
  provider: "resend";
  rawResponse: unknown;
};

export function getInvestorGrowthEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  // Support a common typo env var as fallback to avoid breaking existing setups.
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() ??
    process.env.RESEND_FORM_EMAIL?.trim() ??
    "";

  return {
    apiKey,
    fromEmail,
  };
}

export async function sendInvestorGrowthEmail(
  input: SendInvestorGrowthEmailInput,
): Promise<SendInvestorGrowthEmailResult> {
  const { apiKey, fromEmail } = getInvestorGrowthEmailConfig();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing.");
  }

  if (!fromEmail) {
    throw new Error(
      "Sender email is missing. Set RESEND_FROM_EMAIL (or RESEND_FORM_EMAIL for legacy configs).",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });

  const rawResponse = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    error?: string;
    name?: string;
  };

  if (!response.ok) {
    throw new Error(
      rawResponse.message ||
        rawResponse.error ||
        "Failed to send email through Resend.",
    );
  }

  return {
    messageId: rawResponse.id ?? null,
    provider: "resend",
    rawResponse,
  };
}
