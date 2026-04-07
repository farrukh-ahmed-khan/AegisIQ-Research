import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getApprovalExportRowsByUser } from "@/lib/repositories/investorCampaignApprovalRepository";
import { toStableUuid } from "@/lib/stable-user-id";

function escapeCsv(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }

  return text;
}

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const rows = await getApprovalExportRowsByUser(toStableUuid(userId));
    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";

    if (format === "csv") {
      const header = [
        "campaign_id",
        "company_name",
        "ticker",
        "campaign_status",
        "step_number",
        "channel",
        "approver_role",
        "rule_name",
        "status",
        "submitted_at",
        "sla_due_at",
        "decided_at",
        "invalidated_at",
        "decision_notes",
      ];
      const body = rows
        .map((row) =>
          [
            row.campaign_id,
            row.company_name,
            row.ticker,
            row.campaign_status,
            row.step_number,
            row.channel,
            row.approver_role,
            row.rule_name,
            row.status,
            row.submitted_at,
            row.sla_due_at,
            row.decided_at,
            row.invalidated_at,
            row.decision_notes,
          ]
            .map(escapeCsv)
            .join(","),
        )
        .join("\n");

      return new NextResponse([header.join(","), body].filter(Boolean).join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="investor-growth-approval-export.csv"',
        },
      });
    }

    return NextResponse.json({ approvals: rows });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to export approvals.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
