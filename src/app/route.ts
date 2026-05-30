import { LANDING_HTML } from "@/lib/landing-html";

// Root "/" = the marketing landing. It's a fully self-contained HTML document
// (its own <head>, styles and fonts), so we serve it raw via a Route Handler
// instead of a React page — that keeps it out of the app's root layout, exactly
// as designed. The dashboard now lives at /panel; CTAs here link to /builder.
export const dynamic = "force-static";

export function GET() {
  return new Response(LANDING_HTML, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
