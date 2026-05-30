import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { runTurnToCompletion, buildPrompt, retrieveBuiltHtml } from "@/lib/agent";
import { saveProject } from "@/lib/projects";
import { getCurrentUser } from "@/lib/user";
import type { DocToAppMessage } from "@/ai/messages";

export const runtime = "nodejs";
export const maxDuration = 800; // DEV: synchronous re-tail (held open). DEPLOY uses fire-and-forget + webhook (phase 3).

// POST /api/build { sessionId, confirmedSchema } — sends ONE Opus BUILD steering
// turn with the confirmed schema, bridges live progress, then emits the generated
// index.html as a persistent data-artifact (html inline for dev <iframe srcDoc>).
export async function POST(req: Request) {
  const { sessionId, confirmedSchema }: { sessionId: string; confirmedSchema: unknown } =
    await req.json();

  const stream = createUIMessageStream<DocToAppMessage>({
    onError: (e) => (e instanceof Error ? e.message : "build error"),
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      const textId = crypto.randomUUID();
      let textOpen = false;

      await runTurnToCompletion(sessionId, buildPrompt(confirmedSchema), (ev) => {
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
            data: { phase: "building", detail: ev.name },
            transient: true,
          });
        }
      });

      if (textOpen) writer.write({ type: "text-end", id: textId });

      const html = (await retrieveBuiltHtml(sessionId)).toString("utf8");

      // persist to Mongo → a real shareable /d/[slug] URL (small HTML, no Blob needed)
      const meta =
        (confirmedSchema as {
          meta?: { title?: string; archetype?: string; theme?: { accent?: string } };
        })?.meta ?? {};
      const user = await getCurrentUser();
      const { slug } = await saveProject({
        userId: user.id,
        sessionId,
        title: meta.title ?? "Mini-app",
        archetype: meta.archetype,
        themeAccent: meta.theme?.accent,
        schema: (confirmedSchema as Record<string, unknown>) ?? {},
        html,
      });

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
