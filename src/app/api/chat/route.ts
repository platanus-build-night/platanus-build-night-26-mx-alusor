import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { tools, type DocToAppMessage } from "@/ai/messages";
import { orchestratorSystemPrompt } from "@/ai/prompts";
import { ORCHESTRATOR_MODEL } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/chat — CLARIFY PHASE ONLY (Sonnet). Presents/discusses the inferred
// schema, surfaces parserNotes as proposals, asks <=3 askQuestion (no-execute HITL).
// The schema card is edited client-side; on confirm the client POSTs to /api/build.
export async function POST(req: Request) {
  const {
    messages,
    schema,
  }: { messages: DocToAppMessage[]; schema?: unknown; sessionId?: string } =
    await req.json();

  const system =
    orchestratorSystemPrompt() +
    (schema
      ? `\n\n--- ESQUEMA INFERIDO POR EL MOTOR (preséntalo en es-MX, propón cada parserNote como una pregunta de opción, aclara solo lo ambiguo; el profesional lo edita en la tarjeta) ---\n${JSON.stringify(schema)}`
      : "");

  const result = streamText({
    model: anthropic(ORCHESTRATOR_MODEL),
    system,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(6),
  });

  return result.toUIMessageStreamResponse();
}
