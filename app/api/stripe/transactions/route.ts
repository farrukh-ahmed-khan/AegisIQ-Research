import { auth, createClerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

function toIso(value: number | null | undefined): string | null {
  if (!value || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

export async function GET() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY is not configured." },
        { status: 500 },
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const user = await clerk.users.getUser(userId);
    const publicMetadata = asRecord(user.publicMetadata);
    const privateMetadata = asRecord(user.privateMetadata);

    let customerId = getString(publicMetadata, "stripeCustomerId");
    if (!customerId) {
      customerId = getString(privateMetadata, "stripeCustomerId");
    }

    if (!customerId) {
      return NextResponse.json({ transactions: [] });
    }

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 50,
    });

    const transactions = invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      currency: invoice.currency,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      amountRemaining: invoice.amount_remaining,
      createdAt: toIso(invoice.created),
      paidAt: toIso(invoice.status_transitions.paid_at),
      periodStart: toIso(invoice.period_start),
      periodEnd: toIso(invoice.period_end),
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      subscriptionId:
        typeof invoice.subscription === "string" ? invoice.subscription : null,
    }));

    return NextResponse.json({ transactions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
