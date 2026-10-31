/**
 * Clerk middleware — makes the signed-in session available to pages and lets the client
 * mint tokens for API calls. The API routes still verify the token themselves (auth.ts),
 * so this does not replace that check.
 */
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Run on everything except static files and Next internals; always on /api.
    "/((?!_next|[^?]*\\.(?:html?|css|js|jpg|png|svg|ico|woff2?)).*)",
    "/(api|trpc)(.*)",
  ],
};
