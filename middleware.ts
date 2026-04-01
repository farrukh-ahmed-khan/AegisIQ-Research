import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/dashboard(.*)",
    "/report(.*)",
    "/workspace(.*)",
    "/investor-growth(.*)",
    "/api(.*)",
  ],
};
