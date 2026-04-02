import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOpenAiClient, getOpenAiModel, hasOpenAiKey } from "@/lib/openai";

export const runtime = "nodejs";

type RequestBody = {
  ticker: string;
  company_name: string;
  campaign_objective: string;
  audience_focus: string;
  tone: string;
  notes: string;
};

type ResponseData = {
  strategy: string;
  email_draft: string;
  sms_draft: string;
  social_post: string;
};

type GenerateResponse = {
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

    if (!hasOpenAiKey()) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as RequestBody;

    const {
      ticker,
      company_name,
      campaign_objective,
      audience_focus,
      tone,
      notes,
    } = body;

    // Validate required fields
    if (
      !ticker?.trim() ||
      !company_name?.trim() ||
      !campaign_objective?.trim() ||
      !audience_focus?.trim() ||
      !tone?.trim() ||
      !notes?.trim()
    ) {
      return NextResponse.json(
        {
          error: "All fields are required.",
        },
        { status: 400 },
      );
    }

    const client = getOpenAiClient();

    const prompt = `You are an expert investor relations and business development strategist. 
Generate a comprehensive investor outreach campaign for the following company and objective.

Company Information:
- Ticker: ${ticker}
- Company Name: ${company_name}
- Campaign Objective: ${campaign_objective}
- Target Audience: ${audience_focus}
- Desired Tone: ${tone}
${notes ? `- Additional Notes: ${notes}` : ""}

Please generate the following four pieces of content:

1. Investor Outreach Strategy: A detailed strategy document (3-4 paragraphs) explaining the investor outreach approach, key messaging pillars, timeline, and success metrics.

2. Professional Email Draft: A compelling, personalized email (150-200 words) to send to institutional investors. Include subject line.

3. SMS Message: A concise SMS message (50-80 characters) to complement the email outreach.

4. Social Media Post: A professional social media post (250-300 characters) for investor engagement on LinkedIn.

Return ONLY valid JSON with exactly these keys (no markdown, no code blocks):
{
  "strategy": "...",
  "email_draft": "...",
  "sms_draft": "...",
  "social_post": "..."
}`;

    const completion = await client.chat.completions.create({
      model: getOpenAiModel(),
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert investor relations strategist. Generate investor outreach content in strict JSON format only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content || "{}";
    let parsed: ResponseData;

    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 },
      );
    }

    // Validate response has required fields
    if (
      !parsed.strategy ||
      !parsed.email_draft ||
      !parsed.sms_draft ||
      !parsed.social_post
    ) {
      return NextResponse.json(
        { error: "AI response missing required fields" },
        { status: 500 },
      );
    }

    const response: GenerateResponse = {
      strategy: parsed.strategy,
      email_draft: parsed.email_draft,
      sms_draft: parsed.sms_draft,
      social_post: parsed.social_post,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Investor growth API error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate strategy";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
