import { getProjectHtml } from "@/lib/projects";

export const runtime = "nodejs";

// GET /d/[slug] — serves the generated patient mini-app's raw HTML directly
// (full-screen, no chrome). This is the shareable link the patient opens.
// NOTE (hack): the generated HTML runs on our origin. Fine for the demo (it's
// the patient's own app + localStorage); for production serve from a sandboxed
// origin/Blob domain instead.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const html = await getProjectHtml(slug);
  if (!html) {
    return new Response("Mini-app no encontrada.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
