import { tool, type UIMessage, type InferUITools } from "ai";
import { z } from "zod";

// CLARIFY-phase tools (Sonnet orchestrator). askQuestion is human-in-the-loop:
// NO execute → reaches input-available → the UI collects the answer and calls
// addToolOutput → sendAutomaticallyWhen resubmits. Max ~3 per the orchestrator prompt.
export const tools = {
  askQuestion: tool({
    description:
      "Pregunta al profesional para aclarar un campo ambiguo o proponer cómo representar algo (parserNote). Úsalo como máximo 3 veces, priorizando las propuestas de parserNotes.",
    inputSchema: z.object({
      question: z.string(),
      kind: z.enum(["choice", "text", "scale"]),
      options: z.array(z.string()).optional(),
    }),
    outputSchema: z.string(), // the professional's answer (client-supplied via addToolOutput; no server execute = HITL)
  }),
};

export type DocToAppTools = InferUITools<typeof tools>;

// Custom data parts streamed to the UI.
//  data-schema    (persistent, id="schema") — the editable boundary card
//  data-agent-status (transient) — live parse/build progress
//  data-artifact  (persistent, id="final") — the generated app (html for dev srcDoc; blobUrl for deploy)
export type DocToAppDataParts = {
  schema: Record<string, unknown>;
  "agent-status": { phase: "parsing" | "building" | "reviewing"; detail?: string };
  artifact: { bytes: number; html?: string; blobUrl?: string; slug?: string };
};

export type DocToAppMessage = UIMessage<never, DocToAppDataParts, DocToAppTools>;
