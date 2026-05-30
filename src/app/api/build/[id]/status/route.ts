import { NextResponse } from "next/server";

// GET /api/build/[id]/status — returns { status, artifactUrl } from Mongo for
// client polling (the Vercel-native "ready" notification). On "ready" the
// client injects the /d/[slug] link via useChat setMessages().
// TODO(phase-3): read the Mongo build doc by id.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.json({ id, status: "not_implemented" }, { status: 501 });
}
