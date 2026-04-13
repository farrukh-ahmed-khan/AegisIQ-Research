import {
  clerkMiddleware,
  createClerkClient,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  hasActiveSubscriptionFromClaims,
  hasActiveSubscriptionFromUserPublicMetadata,
  getPlanFromClaims,
  getPlanFromPublicMetadata,
} from "@/lib/subscription-access";
import { planMeetsMinimum, type PlanTier } from "@/lib/plan-access";

const isAuthenticatedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/transactions(.*)",
  "/report(.*)",
  "/reports(.*)",
  "/workspace(.*)",
  "/investor-growth(.*)",
  "/enterprise-inquiry(.*)",
  "/api(.*)",
]);

const isSubscriptionRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/report(.*)",
  "/reports(.*)",
  "/workspace(.*)",
  "/investor-growth(.*)",
  "/api/workspaces(.*)",
  "/api/reports(.*)",
  "/api/investor-growth(.*)",
]);

// Routes that require at least Pro plan
const isProRoute = createRouteMatcher([
  "/investor-growth/campaigns(.*)",
  "/investor-growth/approvals(.*)",
  "/api/investor-growth/campaigns(.*)",
  "/api/investor-growth/contacts(.*)",
  "/api/investor-growth/segments(.*)",
  "/api/investor-growth/analytics(.*)",
  "/api/investor-growth/calendar(.*)",
  "/api/investor-growth/channels(.*)",
  "/api/investor-growth/sms(.*)",
  "/api/investor-growth/social(.*)",
  "/api/investor-growth/generate(.*)",
  "/api/investor-growth/strategy(.*)",
]);

// Routes that require Enterprise plan
const isEnterpriseRoute = createRouteMatcher([
  "/api/investor-growth/enterprise(.*)",
  "/api/investor-growth/approvals/multi-step(.*)",
  "/api/investor-growth/reports/board(.*)",
]);

const isStripeOpenRoute = createRouteMatcher([
  "/api/stripe/webhook(.*)",
  "/api/stripe/create-checkout-session(.*)",
  "/api/stripe/create-billing-portal-session(.*)",
  "/api/stripe/sync-subscription(.*)",
]);

async function getFreshSubscriptionAccess(userId: string) {
  if (!process.env.CLERK_SECRET_KEY) {
    return { isActive: false, plan: null as PlanTier | null };
  }

  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  const user = await clerk.users.getUser(userId);

  return {
    isActive: hasActiveSubscriptionFromUserPublicMetadata(user.publicMetadata),
    plan: getPlanFromPublicMetadata(user.publicMetadata),
  };
}

export default clerkMiddleware(async (auth, req) => {
  if (!isAuthenticatedRoute(req)) {
    return NextResponse.next();
  }

  if (isStripeOpenRoute(req)) {
    return NextResponse.next();
  }

  const authData = await auth();

  if (!authData.userId) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  if (!isSubscriptionRoute(req)) {
    return NextResponse.next();
  }

  let isActive = hasActiveSubscriptionFromClaims(authData.sessionClaims);
  let plan = getPlanFromClaims(authData.sessionClaims);

  // Clerk session claims can lag behind metadata updates from Stripe sync/webhooks.
  // Fall back to a fresh Clerk user read before enforcing subscription redirects.
  if (!isActive) {
    const freshAccess = await getFreshSubscriptionAccess(authData.userId);
    isActive = freshAccess.isActive;
    if (freshAccess.plan) {
      plan = freshAccess.plan;
    }
  }

  if (!isActive) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Subscription required" },
        { status: 402 },
      );
    }

    const pricingUrl = new URL("/pricing", req.url);
    pricingUrl.searchParams.set("required", "subscription");
    return NextResponse.redirect(pricingUrl);
  }

  // Plan-tier checks for Pro routes
  if (isProRoute(req)) {
    if (!planMeetsMinimum(plan, "pro")) {
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            error: "upgrade_required",
            required: "pro",
            current: plan || "starter",
          },
          { status: 403 },
        );
      }
      const pricingUrl = new URL("/pricing", req.url);
      pricingUrl.searchParams.set("required", "pro");
      return NextResponse.redirect(pricingUrl);
    }
  }

  // Plan-tier checks for Enterprise routes
  if (isEnterpriseRoute(req)) {
    if (!planMeetsMinimum(plan, "enterprise")) {
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            error: "upgrade_required",
            required: "enterprise",
            current: plan || "starter",
          },
          { status: 403 },
        );
      }
      const pricingUrl = new URL("/pricing", req.url);
      pricingUrl.searchParams.set("required", "enterprise");
      return NextResponse.redirect(pricingUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard(.*)",
    "/transactions(.*)",
    "/report(.*)",
    "/reports(.*)",
    "/workspace(.*)",
    "/investor-growth(.*)",
    "/enterprise-inquiry(.*)",
    "/api(.*)",
  ],
};
