import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { hasActiveSubscriptionFromClaims } from "@/lib/subscription-access";

const isAuthenticatedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/transactions(.*)",
  "/report(.*)",
  "/reports(.*)",
  "/workspace(.*)",
  "/investor-growth(.*)",
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

const isStripeOpenRoute = createRouteMatcher([
  "/api/stripe/webhook(.*)",
  "/api/stripe/create-checkout-session(.*)",
  "/api/stripe/create-billing-portal-session(.*)",
  "/api/stripe/sync-subscription(.*)",
]);

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

  const isActive = hasActiveSubscriptionFromClaims(authData.sessionClaims);
  if (isActive) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Subscription required" },
      { status: 402 },
    );
  }

  const pricingUrl = new URL("/pricing", req.url);
  pricingUrl.searchParams.set("required", "subscription");
  return NextResponse.redirect(pricingUrl);
});

export const config = {
  matcher: [
    "/dashboard(.*)",
    "/transactions(.*)",
    "/report(.*)",
    "/reports(.*)",
    "/workspace(.*)",
    "/investor-growth(.*)",
    "/api(.*)",
  ],
};
