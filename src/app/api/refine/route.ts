import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { runTurnToCompletion, refinePrompt, retrieveOutput } from "@/lib/agent";
import { getProjectHtml, updateProjectHtml } from "@/lib/projects";
import type { DocToAppMessage } from "@/ai/messages";

export const runtime = "nodejs";
export const maxDuration = 800; // DEV/Render: synchronous steering turn (no fn timeout)

// POST /api/refine { sessionId, slug, instruction } — steering turn to the SAME
// warm session. ROBUST against the platform's output semantics (in-place edits
// don't re-surface; files.list is eventually-consistent): we feed the CURRENT
// html (Mongo = source of truth), ask the agent to write a NEW unique file with
// the change applied, poll until it surfaces, then updateProjectHtml(slug) →
// same /d/[slug]. data-artifact reuses id="final" → preview reconciles in place.
export async function POST(req: Request) {
  const { sessionId, slug, instruction }: {
    sessionId: string;
    slug: string;
    instruction: string;
  } = await req.json();

  const stream = createUIMessageStream<DocToAppMessage>({
    onError: (e) => (e instanceof Error ? e.message : "refine error"),
    execute: async ({ writer }) => {
      writer.write({ type: "start" });

      const current = await getProjectHtml(slug);
      if (current == null) {
        writer.write({ type: "error", errorText: "No encontré la app a refinar." });
        writer.write({ type: "finish" });
        return;
      }

      // unique output filename per refine (new file → surfaces; in-place edits don't)
      const outFile = `index.${crypto.randomUUID().slice(0, 8)}.html`;
      const textId = crypto.randomUUID();
      let textOpen = false;

      await runTurnToCompletion(
        sessionId,
        refinePrompt(current, instruction, outFile),
        (ev) => {
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
              data: { phase: "reviewing", detail: ev.name },
              transient: true,
            });
          }
        },
      );

      if (textOpen) writer.write({ type: "text-end", id: textId });

      const html = (await retrieveOutput(sessionId, outFile)).toString("utf8");
      await updateProjectHtml(slug, html);
      writer.write({
        type: "data-artifact",
        id: "final",
        data: { bytes: html.length, html, slug },
      });
      writer.write({ type: "finish" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
