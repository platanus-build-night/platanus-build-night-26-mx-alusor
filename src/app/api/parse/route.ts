import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { parseTemplate } from "@/lib/agent";
import type { DocToAppMessage } from "@/ai/messages";

export const runtime = "nodejs";
export const maxDuration = 300; // DEV: parse turn held open (no Vercel timeout locally)

// POST /api/parse { sessionId } — runs the Opus PARSE turn, bridges live progress,
// then emits the persistent data-schema card with the inferred (file-based) schema.
export async function POST(req: Request) {
  const { sessionId }: { sessionId: string } = await req.json();

  const stream = createUIMessageStream<DocToAppMessage>({
    onError: (e) => (e instanceof Error ? e.message : "parse error"),
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      const textId = crypto.randomUUID();
      let textOpen = false;

      const schema = await parseTemplate(sessionId, (ev) => {
        if (ev.type === "agent.message") {
          for (const b of ev.content ?? []) {
            if (b.type === "text" && b.text) {
              if (!textOpen) {
                writer.write({ type: "text-start", id: textId });
                textOpen = true;
              }
              writer.write({ type: "text-delta", id: textId, delta: b.text });
            }
          }
        } else if (ev.type === "agent.tool_use") {
          writer.write({
            type: "data-agent-status",
            data: { phase: "parsing", detail: ev.name },
            transient: true,
          });
        }
      });

      if (textOpen) writer.write({ type: "text-end", id: textId });
      writer.write({
        type: "data-schema",
        id: "schema",
        data: schema as Record<string, unknown>,
      });
      writer.write({ type: "finish" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
