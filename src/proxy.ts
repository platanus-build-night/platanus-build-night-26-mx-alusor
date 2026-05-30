import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// FAIL-CLOSED: everything is protected EXCEPT this public allow-list, so any new
// token-spending API route is gated automatically (the whole point — shield the
// Anthropic API-key spend). Public surfaces:
//   /                       → marketing landing (raw HTML route handler)
//   /d/[slug]               → patient mini-app (filled on a phone, no login)
//   /api/webhooks/anthropic → signed by Anthropic, MUST stay unauthenticated
//   /sign-in, /sign-up      → Clerk auth screens
const isPublicRoute = createRouteMatcher([
  "/",
  "/d(.*)",
  "/api/webhooks/anthropic(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
