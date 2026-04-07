import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    templates: [
      {
        id: "investor_sms",
        name: "Investor Nudge",
        body: "Hi {{name}}, sharing the latest {{ticker}} investor update and upcoming catalyst window. Reply if you want the deck.",
      },
      {
        id: "event_follow_up",
        name: "Event Follow-up",
        body: "Thanks for connecting on {{event_name}}. We have a concise investor summary ready if you would like a copy.",
      },
    ],
  });
}
