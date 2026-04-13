import { NextResponse } from "next/server";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const company = typeof body.company === "string" ? body.company.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const numUsers =
      typeof body.numUsers === "string" ? body.numUsers.trim() : "";
    const useCase = typeof body.useCase === "string" ? body.useCase.trim() : "";

    if (!name || !company || !role || !email || !numUsers || !useCase) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 },
      );
    }

    const inquiryPayload = {
      name,
      company,
      role,
      email,
      numUsers,
      useCase,
      submittedAt: new Date().toISOString(),
      source: "enterprise-inquiry-form",
    };

    // Option 1: Send email notification to sales inbox
    const salesEmail = process.env.SALES_NOTIFICATION_EMAIL;
    if (salesEmail && process.env.SENDGRID_API_KEY) {
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: salesEmail }] }],
          from: { email: process.env.SENDGRID_FROM_EMAIL || salesEmail },
          subject: `New Enterprise Inquiry — ${company} (${name})`,
          content: [
            {
              type: "text/plain",
              value: [
                `New Enterprise Inquiry from AegisIQ`,
                ``,
                `Name: ${name}`,
                `Company: ${company}`,
                `Role: ${role}`,
                `Email: ${email}`,
                `Seats needed: ${numUsers}`,
                ``,
                `Use case:`,
                useCase,
                ``,
                `Submitted: ${inquiryPayload.submittedAt}`,
              ].join("\n"),
            },
          ],
        }),
      });
    }

    // Option 2: Post to HubSpot if configured
    const hubspotPortalId = process.env.HUBSPOT_PORTAL_ID;
    const hubspotFormId = process.env.HUBSPOT_ENTERPRISE_FORM_ID;
    if (hubspotPortalId && hubspotFormId) {
      await fetch(
        `https://api.hsforms.com/submissions/v3/integration/submit/${hubspotPortalId}/${hubspotFormId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: [
              { name: "firstname", value: name.split(" ")[0] || name },
              { name: "lastname", value: name.split(" ").slice(1).join(" ") || "" },
              { name: "company", value: company },
              { name: "jobtitle", value: role },
              { name: "email", value: email },
              { name: "numemployees", value: numUsers },
              { name: "message", value: useCase },
            ],
            context: { pageUri: "https://aegisiq-researchs.netlify.app/enterprise-inquiry" },
          }),
        },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit inquiry.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
