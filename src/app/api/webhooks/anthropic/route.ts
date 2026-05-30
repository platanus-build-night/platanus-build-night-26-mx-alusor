import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/webhooks/anthropic — COMPLETION SOURCE OF TRUTH (UNAUTHENTICATED;
// Anthropic posts here with no session). Read raw body via req.text(), verify
// with anthropic.beta.webhooks.unwrap(raw, { headers }), dedupe on event.id.
// On session.status_idled → events.list to confirm stop_reason end_turn →
// files.list+download index.html → publishArtifact → Mongo status:"ready".
// On session.status_terminated → status:"error".
// NOTE: webhook events are PAST-tense (session.status_idled) — NOT the SSE
// present-tense (session.status_idle). See claude-managed-agents.
// TODO(phase-3): implement unwrap + idempotency + publish-on-end_turn.
export async function POST(req: Request) {
  const _raw = await req.text();
  void _raw;
  return NextResponse.json({ status: "not_implemented" }, { status: 501 });
}
