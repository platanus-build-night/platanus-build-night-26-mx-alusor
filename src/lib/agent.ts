import "server-only";
import { toFile } from "@anthropic-ai/sdk";
import { getAnthropic, MANAGED_AGENTS_BETA, BUILD_ENGINE_MODEL } from "./anthropic";
import { buildEngineSystemPrompt } from "@/ai/prompts";

// The DocToApp build engine (Opus Managed Agent). Extracted from the proven
// scripts/engine-smoke.mjs. Used by /api/parse, /api/build, /api/webhooks.
// Verified against @anthropic-ai/sdk@0.100.1, beta managed-agents-2026-04-01.

export const MOUNT_PATH = "/mnt/session/uploads/template.docx";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Create-or-reuse ONE agent + cloud env across sessions. Cached per server
// instance; override with ANTHROPIC_AGENT_ID / ANTHROPIC_ENVIRONMENT_ID to pin.
let agentIdPromise: Promise<string> | undefined;
let envIdPromise: Promise<string> | undefined;

export function ensureAgent(): Promise<string> {
  if (process.env.ANTHROPIC_AGENT_ID)
    return Promise.resolve(process.env.ANTHROPIC_AGENT_ID);
  agentIdPromise ??= getAnthropic().beta.agents
    .create({
      name: "DocToApp Builder",
      model: BUILD_ENGINE_MODEL,
      system: buildEngineSystemPrompt(),
      tools: [{ type: "agent_toolset_20260401" }],
      skills: [
        { type: "anthropic", skill_id: "docx" },
        { type: "anthropic", skill_id: "pdf" },
      ],
    })
    .then((a) => a.id);
  return agentIdPromise;
}

export function ensureEnvironment(): Promise<string> {
  if (process.env.ANTHROPIC_ENVIRONMENT_ID)
    return Promise.resolve(process.env.ANTHROPIC_ENVIRONMENT_ID);
  envIdPromise ??= getAnthropic().beta.environments
    .create({
      name: "doctoapp-cloud",
      config: { type: "cloud", networking: { type: "unrestricted" } },
    })
    .then((e) => e.id);
  return envIdPromise;
}

/** Upload the user .docx to the Files API → file_id. */
export async function uploadTemplate(
  bytes: Buffer | Uint8Array,
  filename = "template.docx",
): Promise<string> {
  const uploaded = await getAnthropic().beta.files.upload({
    file: await toFile(bytes, filename, { type: DOCX_MIME }),
  });
  return uploaded.id;
}

/** Create the stateful build session with the docx mounted. Returns sessionId. */
export async function createBuildSession(
  fileId: string,
  title = "DocToApp build",
): Promise<string> {
  const [agent, environmentId] = await Promise.all([
    ensureAgent(),
    ensureEnvironment(),
  ]);
  const session = await getAnthropic().beta.sessions.create({
    agent,
    environment_id: environmentId,
    title,
    resources: [{ type: "file", file_id: fileId, mount_path: MOUNT_PATH }],
  });
  return session.id;
}

export async function sendUserTurn(
  sessionId: string,
  text: string,
): Promise<void> {
  await getAnthropic().beta.sessions.events.send(sessionId, {
    events: [{ type: "user.message", content: [{ type: "text", text }] }],
  });
}

type AgentEvent = {
  type: string;
  content?: Array<{ type: string; text?: string }>;
  name?: string;
  stop_reason?: { type?: string };
  error?: { message?: string };
};

/** Open the stream BEFORE sending (avoids a race), then drive one turn to
 *  completion (end_turn). `onEvent` lets callers bridge live progress. */
export async function runTurnToCompletion(
  sessionId: string,
  text: string,
  onEvent?: (ev: AgentEvent) => void,
): Promise<void> {
  const stream = await getAnthropic().beta.sessions.events.stream(sessionId);
  await sendUserTurn(sessionId, text);
  for await (const ev of stream as AsyncIterable<AgentEvent>) {
    onEvent?.(ev);
    if (ev.type === "session.error")
      throw new Error(ev.error?.message ?? "agent session error");
    if (ev.type === "session.status_terminated")
      throw new Error("agent session terminated");
    if (ev.type === "session.status_idle" && ev.stop_reason?.type === "end_turn")
      break;
  }
}

/** Retrieve a file the agent wrote to /mnt/session/outputs/. files.download
 *  returns APIPromise<Response> (verified vs the installed .d.ts). */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retrieve a file the agent wrote to /mnt/session/outputs/. NOTE (verified):
 *  files.list is EVENTUALLY-CONSISTENT (newly written files surface after a
 *  short delay), and an in-place EDIT does NOT update an existing file_id's
 *  content — so each turn must write a NEW unique filename. We poll until it
 *  surfaces and pick the newest match. files.download → APIPromise<Response>. */
export async function retrieveOutput(
  sessionId: string,
  filename: string,
  { tries = 20, intervalMs = 2500 }: { tries?: number; intervalMs?: number } = {},
): Promise<Buffer> {
  for (let i = 0; i < tries; i++) {
    const outputs = await getAnthropic().beta.files.list({
      scope_id: sessionId,
      betas: [MANAGED_AGENTS_BETA],
    });
    const data = (outputs.data ?? []) as Array<{
      id: string;
      filename?: string;
      created_at?: string;
      downloadable?: boolean;
    }>;
    const matches = data
      .filter((f) => f.filename === filename && f.downloadable !== false)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    if (matches.length) {
      const res = await getAnthropic().beta.files.download(matches[0].id);
      return Buffer.from(await res.arrayBuffer());
    }
    if (i < tries - 1) await sleep(intervalMs);
  }
  throw new Error(
    `agent did not surface ${filename} in /mnt/session/outputs after ${tries} tries`,
  );
}

const PARSE_PROMPT = `El template del clínico está montado en ${MOUNT_PATH}. Este es un PARSE turn: léelo con la skill docx, infiere nuestro esquema intermedio (conforme al contrato) y ESCRÍBELO como JSON válido en /mnt/session/outputs/schema.json. NO construyas la app todavía.`;

/** Run the parse turn, then read + JSON.parse schema.json (validate upstream). */
export async function parseTemplate(
  sessionId: string,
  onEvent?: (ev: AgentEvent) => void,
): Promise<unknown> {
  await runTurnToCompletion(sessionId, PARSE_PROMPT, onEvent);
  const buf = await retrieveOutput(sessionId, "schema.json");
  return JSON.parse(buf.toString("utf8"));
}

export function buildPrompt(confirmedSchema: unknown): string {
  return `BUILD turn. Usa EXACTAMENTE este esquema confirmado y construye la mini-app del paciente en /mnt/session/outputs/index.html (un solo archivo HTML autocontenido, móvil-first, localStorage, acentos en español preservados):\n\n${JSON.stringify(confirmedSchema)}`;
}

export function refinePrompt(
  currentHtml: string,
  instruction: string,
  outFile: string,
): string {
  return `REFINE turn. Este es el HTML COMPLETO actual de la mini-app del paciente:\n\n<<<HTML_ACTUAL\n${currentHtml}\nHTML_ACTUAL>>>\n\nAplica ÚNICAMENTE este cambio (no toques nada más):\n${instruction}\n\nEscribe el HTML FINAL COMPLETO (con el cambio aplicado) usando tu herramienta write en la ruta EXACTA: /mnt/session/outputs/${outFile}\nEs un archivo NUEVO (no edites index.html). Mantén el formato autocontenido (sin librerías ni red), móvil-first, localStorage y los acentos en español preservados.`;
}

/** Fire-and-forget: send the build turn and return. Completion → webhook/poll. */
export async function kickBuild(
  sessionId: string,
  confirmedSchema: unknown,
): Promise<void> {
  await sendUserTurn(sessionId, buildPrompt(confirmedSchema));
}

/** Refine: a steering turn to the same idle, checkpointed session. */
export async function kickRefine(
  sessionId: string,
  instruction: string,
): Promise<void> {
  await sendUserTurn(sessionId, instruction);
}

export async function retrieveBuiltHtml(sessionId: string): Promise<Buffer> {
  return retrieveOutput(sessionId, "index.html");
}
