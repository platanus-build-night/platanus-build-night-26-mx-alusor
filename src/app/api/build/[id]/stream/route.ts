import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300; // optional live-tail; needs Pro/Fluid for the full build

// GET /api/build/[id]/stream — OPTIONAL re-tailable live progress ([id] = sessionId).
// Open anthropic.beta.sessions.events.stream(id), seed seen ids via events.list,
// dedupe, bridge to a UI message stream. Best-effort; the webhook is the real
// completion source of truth. DEV uses the synchronous /api/build bridge instead.
// TODO(phase-3/deploy): implement the re-tail bridge.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.json(
    { sessionId: id, status: "not_implemented" },
    { status: 501 },
  );
}
