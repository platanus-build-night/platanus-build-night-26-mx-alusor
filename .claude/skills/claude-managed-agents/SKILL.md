---
name: claude-managed-agents
description: "Build the DocToApp PARSE+BUILD engine on Anthropic Claude Managed Agents (cloud sandbox + official docx/pdf Agent Skills). Use when wiring the /api/chat route's bridge to a Managed Agent, creating agents/environments/sessions with @anthropic-ai/sdk, uploading the user .docx via the Files API and mounting it into the session, streaming the SSE event loop (assistant text + tool activity + status), steering/interrupting the refine loop, or retrieving the generated index.html from the cloud sandbox. Verified against @anthropic-ai/sdk@0.100.1, beta header managed-agents-2026-04-01, model claude-opus-4-8."
---

# Claude Managed Agents (TypeScript) — DocToApp PARSE+BUILD engine

Managed Agents = Anthropic's hosted agent harness. You get Claude + a secure cloud sandbox with file tools (bash/read/write/edit/glob/grep + web_fetch/web_search) + official Agent Skills (docx, pdf, pptx, xlsx). The harness runs the agent loop, executes tools server-side, and streams events over SSE. We use it as the agentic engine that reads the uploaded `.docx`, infers a schema, and **iteratively** builds a self-contained `index.html` (write → bash review → edit → repeat). Critically, the build runs **async on Anthropic** — once kicked off it keeps going whether or not you hold a stream open (see "Async completion").

> Ground truth verified live (May 2026): `@anthropic-ai/sdk@0.100.1`, beta header `managed-agents-2026-04-01`. Files API beta header `files-api-2025-04-14`. The SDK sets the managed-agents beta header automatically on `client.beta.*` calls — you do **not** pass `betas` to agents/sessions/events calls. You **do** pass `betas` on the Files API `list` call when using `scope_id` (see §7). Never mix the Messages-API code-execution/skills beta headers with the managed-agents header.

## Two models — do not confuse them

| Role | Model id | Where it lives |
|---|---|---|
| **BUILD ENGINE** (this skill) — the managed agent that reads the `.docx`, infers the schema, and builds `index.html` | `claude-opus-4-8` (string, or `{ id: "claude-opus-4-8", speed: "fast" }`) | the `model` field of `agents.create` below |
| **CHAT / ORCHESTRATION BRAIN** — the `/api/chat` route's LLM (NOT this skill). Owns ONLY the CLARIFY phase. | `anthropic("claude-sonnet-4-6")` | the AI-SDK chat skill |

The split matters for steering (§8) and for the schema round trip (§7): Opus is the **only** thing that can parse the docx and that builds; Sonnet runs the editable schema card + `askQuestion` clarify loop and never holds the build.

## The 4 objects + the mental model

| Object | What it is | Lifetime |
|---|---|---|
| **Agent** | model + system prompt + tools + skills + mcp_servers. Versioned, reusable. | Create once, reference by id. |
| **Environment** | where sessions run: `cloud` (Anthropic) or `self_hosted`. **Not versioned.** | Create once, reuse. |
| **Session** | a running agent instance in an environment with its own sandbox + history. | One per document build; stays alive/idle between turns. |
| **Events** | bidirectional messages (`user.*` you send, `agent.*`/`session.*`/`span.*` you receive over SSE) **and** the separate PAST-TENSE webhook event stream (see "Async completion"). | Streamed/persisted per session, fetchable via `events.list`. |

Flow for DocToApp: **create agent (once)** → **create cloud env (once)** → **upload .docx → file_id** → **create session mounting that file_id** → **open stream + send PARSE-only turn** → **agent writes `/mnt/session/outputs/schema.json`** → **`files.list`+`download` it, zod-validate, persist** (session stays idle/alive) → **(CLARIFY happens entirely in Sonnet)** → **send ONE build steering turn with the confirmed schema** → **fire-and-forget; webhook or poll for completion** → **retrieve `index.html` from sandbox outputs** → upload to Vercel Blob. Refines (§8) re-attach to the SAME idle session.

## Client setup

```ts
import Anthropic from "@anthropic-ai/sdk";
import { toFile } from "@anthropic-ai/sdk";
import fs from "node:fs/promises";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY
// All managed-agents calls live under client.beta.{agents,environments,sessions,files,skills}
// Webhook verification lives under client.beta.webhooks.unwrap (see "Async completion").
```

## 1. Create the Agent (with docx + pdf Skills attached)

Skills are attached on the **agent** via the `skills` array — NOT via `container` (that `container.skills` shape is the *Messages API* code-execution path; Managed Agents uses a top-level `skills` field). Anthropic pre-built skills use `type: "anthropic"` + short `skill_id` (`docx`, `pdf`, `pptx`, `xlsx`); custom uploaded skills use `type: "custom"` + the `skill_*` id with a `version`.

```ts
const agent = await client.beta.agents.create({
  name: "DocToApp Builder",
  model: "claude-opus-4-8", // BUILD ENGINE. For fast mode pass { id: "claude-opus-4-8", speed: "fast" }
  system: `You are DocToApp's build engine. You receive a Word (.docx) template mounted in the sandbox.
PARSE turns: read it with the docx skill, infer our intermediate JSON schema, and WRITE that schema to /mnt/session/outputs/schema.json. Do NOT build on a parse turn.
BUILD turns: you are given a confirmed schema. Build a SINGLE self-contained index.html (inline CSS + JS, no external deps) that a patient fills; persist answers to localStorage.
Work AGENTICALLY: write the file, open it / lint it with bash, fix issues, iterate until it is correct and accessible.
Write the FINAL artifact to /mnt/session/outputs/index.html. Only files written there are persisted.
Keep going until the app is complete; do not stop after the first draft.`,
  tools: [{ type: "agent_toolset_20260401" }], // full toolset: bash, read, write, edit, glob, grep, web_fetch, web_search
  skills: [
    { type: "anthropic", skill_id: "docx" }, // version optional; defaults to latest
    { type: "anthropic", skill_id: "pdf" },
  ],
});
// agent.id (agent_01...), agent.version (starts at 1)
```

Notes:
- `agent_toolset_20260401` enables all file tools by default. To disable one: `tools: [{ type: "agent_toolset_20260401", configs: [{ name: "web_fetch", enabled: false }] }]`. To start all-off and opt-in: add `default_config: { enabled: false }` then enable per `configs`.
- `web_fetch` / `web_search` are **agent tools** (toggled here in `tools`), and are **independent** of the sandbox egress `networking` config (see §2).
- Tool outputs over 100K tokens auto-spill to a sandbox file; the model gets a truncated preview + the path.
- Max 20 skills per session. Anthropic skills version is date-based (e.g. `20251013`) or `"latest"`; custom skills version is an epoch timestamp or `"latest"`.
- We do **not** declare any agent-side custom tools. The `askQuestion` clarify mechanism lives on the AI-SDK/Sonnet side (§8b); the agent-side custom-tool/`requires_action` path is the **rejected** Option-2 and its declaration shape on `agents.create` is unverified — see §9-custom-tools.
- **Updating** an agent makes a new version: `await client.beta.agents.update(agent.id, { version: agent.version, system: "..." })`. Array fields (`tools`, `skills`, `mcp_servers`) are FULL replacements; scalars (`system`) replaced (pass `null` to clear `system`/`description`); `metadata` merges per-key. No-op updates return the existing version.

## 2. Create the cloud Environment

```ts
// PRODUCTION-LEANING default: "limited" egress + explicit allowed_hosts (least privilege).
const environment = await client.beta.environments.create({
  name: "doctoapp-cloud",
  config: {
    type: "cloud",
    networking: {
      type: "limited",
      allowed_hosts: ["api.anthropic.com"], // HTTPS hosts the sandbox may reach
      allow_package_managers: true,          // allow PyPI/npm/etc (default false)
      allow_mcp_servers: false,              // default false
    },
  },
});
// environment.id (env_01...)
```

### Networking enum — VERIFIED LIVE (Cloud environment setup doc, May 2026)

`config.networking.type` controls only the **sandbox's outbound egress**. Two values:

| `type` | Behavior |
|---|---|
| `"unrestricted"` | **Default.** Full outbound network access except a general safety blocklist. Simplest for the hackathon. |
| `"limited"` | Restricts egress to `allowed_hosts: string[]` (HTTPS-prefixed). `allow_package_managers` (default `false`) opens public registries; `allow_mcp_servers` (default `false`) opens the agent's configured MCP endpoints. |

> **VERIFIED QUOTE:** "The `networking` field controls the sandbox's outbound network access. **It does not impact the `web_search` or `web_fetch` tools' allowed domains.**" So even with `limited` egress, the agent's `web_fetch`/`web_search` tools still work against their own allowed-domain policy — they are separate agent tools, not sandbox egress.

> **Verify before shipping:** the snippet above uses `"limited"` (Anthropic's production recommendation). For a quick hackathon spin you can use `networking: { type: "unrestricted" }` instead — both enum values are confirmed valid. Pick one deliberately and confirm the sandbox actually needs whatever hosts you allow.

`type: "self_hosted"` exists for running the sandbox on your own infra (compliance / data residency) — out of scope for the hackathon; with self-hosted you must also feed `agent_toolset` results back via `user.tool_result` events (cloud does this automatically). Environments are **not versioned**; create once and reuse across builds (log your own env changes if you mutate them).

## 3. Upload the user's .docx (Files API) → file_id

```ts
const uploaded = await client.beta.files.upload({
  file: await toFile(
    await fs.readFile("/tmp/template.docx"), // or a Buffer/Blob/stream
    "template.docx",
    { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  ),
});
// uploaded.id (file_01...)
```

Files API beta header is `files-api-2025-04-14`, but `client.beta.files.upload` sets it for you. Files are workspace-scoped, persist until deleted, max 500MB. **Uploaded files cannot be re-downloaded** via the API — only files the agent *creates* (skills/code-exec/sandbox outputs) are downloadable. Persist `uploaded.id` on the document record so you can `files.delete` it on cleanup (see DELIVERY pattern).

## 4. Create the Session — MOUNT the file via `resources` (not in the message)

The uploaded docx is made available to the sandbox through the **`resources`** array at session creation, which mounts it at a filesystem path. Do NOT try to put a `document`/`file_id` content block in the `user.message` — the managed-agent file-input mechanism is the mount.

```ts
const MOUNT_PATH = "/mnt/session/uploads/template.docx";

const session = await client.beta.sessions.create({
  agent: agent.id,                 // string => latest agent version
  environment_id: environment.id,
  title: "Build app from template.docx",
  resources: [
    { type: "file", file_id: uploaded.id, mount_path: MOUNT_PATH },
  ],
});
// session.id (sesn_01...). Session starts in status "idle"; no work runs yet.
```

- `mount_path` is optional; default is `/mnt/session/uploads/<file_id>`. Set an explicit path so the prompt can name it.
- Resource union also supports `{ type: "github_repository", url, authorization_token, mount_path? }` (default `/workspace/<repo-name>`) and `{ type: "memory_store", ... }`.
- To pin an agent version: `agent: { type: "agent", id: agent.id, version: 1 }`.
- MCP OAuth creds go via `vault_ids: [...]` at create time.
- Session statuses: `idle` (waiting for input/confirmation), `running`, `rescheduling` (auto-retry transient error), `terminated` (unrecoverable). The session stays alive at `idle` between the parse turn, the (Sonnet-side) clarify phase, the build turn, and any refines — one session per document, reused.

## 5. Send the turn + STREAM the SSE events

Open the stream **before** sending the user event (only events emitted after the stream opens are delivered — avoids a race). TS SDK method is `client.beta.sessions.events.stream(sessionId)`, which returns an **async-iterable `Stream`** — consume it with `for await (const event of stream)`. Do **not** wrap it in `EventSourceParserStream`; the SDK already parses the SSE frames into typed event objects.

> These SSE event names are **PRESENT-TENSE** (`session.status_idle`, `session.status_running`, …). The webhook stream uses **DIFFERENT, PAST-TENSE** names (`session.status_idled`, …). Do not cross them — see "Async completion".

```ts
const stream = await client.beta.sessions.events.stream(session.id);

await client.beta.sessions.events.send(session.id, {
  events: [
    {
      type: "user.message",
      content: [
        {
          // PARSE-ONLY turn:
          type: "text",
          text: `The clinician's intake template is mounted at ${MOUNT_PATH}. Read it with the docx skill, infer our intermediate JSON schema, WRITE it to /mnt/session/outputs/schema.json, and do NOT build yet.`,
        },
      ],
    },
  ],
});

let assistantText = "";
for await (const event of stream) {
  switch (event.type) {
    case "agent.message":            // assistant prose — iterate content blocks
      for (const block of event.content) {
        if (block.type === "text") {
          assistantText += block.text;
          process.stdout.write(block.text);
        }
      }
      break;
    case "agent.thinking":           // extended-thinking content, separate from messages
      break;
    case "agent.tool_use":           // agent invoked bash/write/edit/etc — event.name has the tool
      console.log(`\n[tool: ${event.name}]`);
      break;
    case "agent.tool_result":        // result of that tool (cloud feeds it back automatically)
      break;
    case "session.status_running":
      break;
    case "session.status_idle":      // turn done — inspect event.stop_reason
      // stop_reason.type: "end_turn" | "requires_action" | ...
      break;
    case "session.error":            // typed error; event.error?.message, event.error has retry_status
      console.error(`\n[error] ${event.error?.message ?? "unknown"}`);
      break;
  }
  if (event.type === "session.status_idle" && event.stop_reason?.type === "end_turn") break;
  if (event.type === "session.error") break;
}
```

### AUTHORITATIVE event → output mapping (VERIFIED vs the data-analyst cookbook)

This is the single source of truth other skills must follow when bridging the **SSE** stream:

| Event (SSE / present-tense) | `event` fields | Maps to |
|---|---|---|
| `agent.message` | iterate `event.content`; for `block.type === "text"` use `block.text` | assistant text (→ `text-delta`) |
| `agent.thinking` | `event.content` (thinking) | extended thinking — usually ignored in UI |
| `agent.tool_use` | `event.name` = tool name | transient tool-activity part (→ `data-tool`) |
| `agent.tool_result` | result of the tool | usually internal; cloud feeds it back automatically |
| `session.status_idle` + `event.stop_reason?.type === "end_turn"` | — | **TURN DONE** → close text part, break |
| `session.status_idle` + `event.stop_reason?.type === "requires_action"` | `stop_reason.event_ids` | needs tool confirmation / custom-tool result (the REJECTED path — see §9-custom-tools) |
| `session.error` | `event.error?.message` | error part (→ `{ type: "error" }`), break |

### Full event type reference (SSE)

**User events (you send):** `user.message`, `user.interrupt`, `user.custom_tool_result`, `user.tool_confirmation`, `user.define_outcome`, `user.tool_result` (self-hosted only).

**Agent events (you receive):** `agent.message`, `agent.thinking`, `agent.tool_use`, `agent.tool_result`, `agent.mcp_tool_use`, `agent.mcp_tool_result`, `agent.custom_tool_use`, `agent.thread_context_compacted`, plus multiagent `agent.thread_message_*`.

**Session events:** `session.status_running`, `session.status_idle` (has `stop_reason`), `session.status_rescheduled`, `session.status_terminated`, `session.updated`, `session.error`.

**Span events (observability):** `span.model_request_start`, `span.model_request_end` (has `model_usage` token counts), `span.outcome_evaluation_*`.

Every event has a `processed_at` timestamp (null = queued, not yet processed) and an `id`.

## 6. Bridging to the Vercel AI SDK v6 stream (our /api/chat) — CANONICAL

In the Next.js route, map managed-agent SSE events onto an AI SDK UI-message stream. Open the managed-agent stream **first**, then for each event push the corresponding AI SDK stream part. This bridge is the authoritative shape the chat skill depends on. (For the parse turn the same bridge applies; the *result* of parsing is read from the file, not scraped from the stream — see §7.)

```ts
// app/api/chat/route.ts (server)
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

export async function POST(req: Request) {
  const { sessionId, prompt } = await req.json();

  const stream = createUIMessageStream({
    async execute({ writer }) {
      // 1) open the managed-agent stream BEFORE sending the turn (avoids a race)
      const agentStream = await client.beta.sessions.events.stream(sessionId);
      await client.beta.sessions.events.send(sessionId, {
        events: [{ type: "user.message", content: [{ type: "text", text: prompt }] }],
      });

      // 2) consume the async-iterable Stream and bridge each event
      const textId = crypto.randomUUID();
      writer.write({ type: "text-start", id: textId });
      for await (const ev of agentStream) {
        if (ev.type === "agent.message") {
          for (const b of ev.content) {
            if (b.type === "text") writer.write({ type: "text-delta", id: textId, delta: b.text });
          }
        } else if (ev.type === "agent.tool_use") {
          // surface tool activity as a transient data part for Generative UI
          writer.write({ type: "data-tool", data: { name: ev.name }, transient: true });
        } else if (ev.type === "session.status_idle" && ev.stop_reason?.type === "end_turn") {
          break; // turn complete
        } else if (ev.type === "session.error") {
          writer.write({ type: "error", errorText: ev.error?.message ?? "agent error" });
          break;
        }
      }
      writer.write({ type: "text-end", id: textId });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
```

Notes for the consumer:
- This route owns the server bridge only; the client `useChat`/transport config and any `parseJsonEventStream` usage live in the AI-SDK chat skill, not here. (Those AI-SDK client details — whether `useChat` takes an `api` field vs configuring it on `DefaultChatTransport`, and the exact `parseJsonEventStream` export from `"ai"` — are owned/verified by that skill; this skill does not assert them.)
- Keep the `askQuestion` human-in-the-loop tool on the **AI-SDK/Sonnet side** (Generative UI in the chat), not as a managed-agent custom tool — the managed agent should run autonomously to build; ambiguity is resolved in your chat layer (Sonnet) and folded into the FINAL schema, then sent to Opus as ONE build steering turn (§8). See §9-custom-tools for why the agent-side path is rejected.

## 7. The schema round trip + RETRIEVE the generated index.html — FILE-BASED HANDOFF

**Critical rule:** only files the agent writes to **`/mnt/session/outputs/`** are persisted and surfaced via the Files API. Anything written elsewhere in the container is ephemeral. So the system prompt MUST instruct the agent to write its artifacts there (we do, in §1).

**Prefer the file handoff over scraping streamed text.** Both the inferred schema and the built app are passed as **files** the agent writes, then the route `files.list`+`files.download`s and validates. Do NOT regex-scrape `agent.message` text deltas for the schema JSON or the HTML — that is brittle and unverifiable; the streamed text is for live UX only.

### 7a. Parse turn → schema.json round trip

1. Send the PARSE-only turn (§5): "read template.docx with the docx skill, infer the intermediate JSON schema, WRITE it to `/mnt/session/outputs/schema.json`, do NOT build."
2. On `session.status_idle` / `end_turn`, list + download `schema.json`:

```ts
const outputs = await client.beta.files.list({
  scope_id: session.id,
  betas: ["managed-agents-2026-04-01"], // required to use scope_id
});
const schemaFile = outputs.data.find((f) => f.filename === "schema.json");
if (!schemaFile) throw new Error("agent did not write schema.json to /mnt/session/outputs");

const dl = await client.beta.files.download(schemaFile.id);
const schemaBuf = Buffer.from(await dl.arrayBuffer()); // see §7c defensive read
const schema = JSON.parse(schemaBuf.toString("utf8"));
// zod-validate `schema`, then persist { sessionId, agentId, schema, archetype }.
// The session stays idle/alive; CLARIFY now runs in Sonnet (§8b). The validated schema
// seeds the chat as a persistent custom data part (owned by the AI-SDK chat skill).
```

### 7b. Build turn → index.html round trip

After the user confirms the (possibly clarify-edited) schema, send ONE build steering turn embedding the **final** schema verbatim (§8). On completion, retrieve `index.html` the same way:

```ts
const outputs = await client.beta.files.list({ scope_id: session.id, betas: ["managed-agents-2026-04-01"] });
const indexFile = outputs.data.find((f) => f.filename === "index.html");
if (!indexFile) throw new Error("agent did not produce index.html in /mnt/session/outputs");
const content = await client.beta.files.download(indexFile.id);
const buf = Buffer.from(await content.arrayBuffer()); // see §7c
await fs.writeFile("/tmp/index.html", buf); // → then put() to Vercel Blob
```

`files.download` works because skill/sandbox-created files are `downloadable: true` (unlike your uploaded docx). `files.retrieveMetadata(id)` gives `filename`, `size_bytes`, `mime_type`.

### 7c. Defensive byte read (VERIFY against installed .d.ts)

```ts
// PRIMARY byte-read (Response-like with .arrayBuffer()):
const buf = Buffer.from(await content.arrayBuffer());

// DEFENSIVE fallback — VERIFY against the installed @anthropic-ai/sdk@0.100.1 .d.ts before relying on it:
//   - if `download` returns a fetch Response:        const buf = Buffer.from(await content.arrayBuffer());
//   - if it returns a Node Readable stream instead:  const chunks: Buffer[] = [];
//                                                      for await (const c of content) chunks.push(Buffer.from(c));
//                                                      const buf = Buffer.concat(chunks);
// (node_modules was not present at authoring time, so the exact return type is unconfirmed here — check the .d.ts.)
```

## 8. STEER the session — CLARIFY (Sonnet, not steered) vs REFINE (steered into the live session)

The session is stateful; the sandbox (filesystem, the in-progress `index.html`, installed packages) is checkpointed and resumes cleanly. Two distinct concepts — keep them separate:

- **CLARIFY answers** (the `askQuestion` loop, §8b) **stay in Sonnet.** They refine Sonnet's schema *view* (the editable schema card). They are **NOT** steered into Opus one question at a time. Opus receives exactly **ONE clean build steering turn** carrying the **FINAL confirmed schema**.
- **REFINE instructions** (post-build "make the mood scale 0–10", §8a) **are steered into the live Opus session** as `user.message` turns (each refine = a new POST re-attaching to the idle session; see DELIVERY pattern).

### 8a. Refine / interrupt + redirect (steered into the live session)

For a refine, send a plain `user.message` to the existing session. Prepend `user.interrupt` **only if** the agent is still mid-build and you must redirect it now; if the session is already `idle`, the plain message resumes the checkpointed sandbox.

```ts
await client.beta.sessions.events.send(session.id, {
  events: [
    // OPTIONAL — only if a build is actively running and must change course immediately:
    // { type: "user.interrupt" },
    {
      type: "user.message",
      content: [{ type: "text", text: "Make the mood scale 0–10 instead of 1–5, and add a daily reminder note field." }],
    },
  ],
});
// then re-open / continue the event stream (§5/§6) to surface the agent's continued work,
// and re-retrieve index.html (§7b) when it idles with end_turn.
```

### 8b. CLARIFY via askQuestion → folded into the FINAL schema (NOT steered per-answer)

`askQuestion` is an **AI-SDK-side human-in-the-loop tool with NO `execute` fn**, living on the **Sonnet** loop: it goes `input-available` → the chat UI collects the user's answer → client calls `addToolOutput({ tool, toolCallId, output })` (NOT the deprecated `addToolResult`) → `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls` resubmits to `/api/chat`. The answer updates Sonnet's schema view — it is **not** sent to Opus yet.

When the user finally **Confirms**, the client sends `{ confirmedSchema, sessionId }` and the build kickoff injects that schema verbatim into the **single** build steering turn:

```ts
// /api/build kickoff — ONE clean steering turn carrying the FINAL confirmed schema:
await client.beta.sessions.events.send(sessionId, {
  events: [
    {
      type: "user.message",
      content: [{ type: "text", text:
        `Build the patient mini-app now from this CONFIRMED schema (build only, write /mnt/session/outputs/index.html):\n` +
        JSON.stringify(confirmedSchema) }],
    },
  ],
});
// fire-and-forget: return immediately; rely on webhook/poll (see "Async completion") for completion.
```

(Checkpoints persist 30 days from last activity; history persists until you delete the session.)

## Async completion: webhooks vs polling — AUTHORITATIVE

**Fire-and-forget is safe.** Managed Agents run async on Anthropic. Closing the SSE stream (or the producing serverless function exiting) does **NOT** stop the build — events persist server-side and are fetchable later via `client.beta.sessions.events.list(sessionId)`. So `/api/build` can `send` the build turn and return immediately (Hobby-safe; the 60s function cap no longer blocks the build).

Two delivery patterns (see "DELIVERY pattern" below):
- **DEV** = synchronous re-tail (hold one stream open; `next dev` has no timeout).
- **DEPLOY** = fire-and-forget; a **webhook** publishes the artifact while no client is connected; the browser polls `GET /api/build/[id]/status`.

### Webhook event names are PAST-TENSE and DIFFER from the SSE names — DO NOT CROSS THEM

The webhook stream uses **past-tense** `data.type` values that are NOT the present-tense SSE names in §5. The single most common bug: switching a webhook handler on `session.status_idle`. **That SSE name never arrives on a webhook.** The webhook fires `session.status_idled`.

| Webhook `data.type` (PAST-TENSE) | Meaning | SSE analogue (different name!) |
|---|---|---|
| `session.status_idled` | turn finished (build done OR paused for action) — **completion/pause signal** | `session.status_idle` |
| `session.status_terminated` | terminal/unrecoverable error | `session.status_terminated` |
| `session.status_run_started` | a run began | `session.status_running` |
| `session.status_rescheduled` | transient auto-retry | `session.status_rescheduled` |
| `session.thread_created` / `session.thread_idled` / `session.thread_terminated` | multiagent thread lifecycle | — |
| `session.outcome_evaluation_ended` | outcome eval finished | `span.outcome_evaluation_*` |

Subscribe primarily to **`session.status_idled`** (completion OR pause) and **`session.status_terminated`** (terminal error).

### THIN payload → you MUST GET to hydrate (no stop_reason in the webhook)

The webhook payload is **thin** and carries **NO `stop_reason`**. Shape:

```jsonc
{
  "type": "event",
  "id": "event_...",            // top-level event id — dedupe on THIS (retries reuse it)
  "created_at": "...",
  "data": {
    "type": "session.status_idled", // event.data.type = the event type
    "id": "sesn_...",               // event.data.id = the SESSION id (NOT a stop_reason)
    "organization_id": "...",
    "workspace_id": "..."
  }
}
```

Because there is **no `stop_reason` in the payload**, on `session.status_idled` you cannot tell whether the session finished (`end_turn` → publish the artifact) or merely paused (`requires_action`). You **MUST GET-to-hydrate**: call `events.list` filtered to the idle event type and read the latest event's `stop_reason.type`:

```ts
// inside the webhook handler, after verifying:
const latest = await client.beta.sessions.events.list(sessionId, { types: ["session.status_idle"] });
// read the most recent event's stop_reason.type:
//   "end_turn"        -> build done: files.list+download index.html (§7b) -> Blob + Mongo status:"ready"
//   "requires_action" -> paused: do NOT publish
```

> NOTE the asymmetry: the **webhook** event type is `session.status_idled` (past tense), but you hydrate by listing the **SSE/event-history** type `session.status_idle` (present tense). Both are correct in their own surface.

### Verify the signature with webhooks.unwrap(raw, { headers })

Read the **raw bytes** of the request body (do NOT `JSON.parse` first) and pass them with the headers to `unwrap`, which verifies the signature and rejects stale (>5min) requests:

```ts
// app/api/webhooks/anthropic/route.ts
export async function POST(req: Request) {
  const raw = await req.text();                 // raw bytes; do NOT JSON.parse first
  const event = client.beta.webhooks.unwrap(raw, { headers: req.headers }); // throws on bad sig / >5min stale
  // env: ANTHROPIC_WEBHOOK_SIGNING_KEY (whsec_...)

  if (await alreadyHandled(event.id)) return new Response(null, { status: 200 }); // idempotency by top-level event.id
  await markHandled(event.id);

  if (event.data.type === "session.status_idled") {
    const sessionId = event.data.id;
    // GET-to-hydrate (above) to tell end_turn from requires_action, then publish if done.
  } else if (event.data.type === "session.status_terminated") {
    // mark the build failed in Mongo
  }
  return new Response(null, { status: 200 }); // ack with 2xx
}
```

- **Env:** `ANTHROPIC_WEBHOOK_SIGNING_KEY` (a `whsec_...` secret).
- **Idempotency:** dedupe on the **top-level `event.id`** — retries reuse it.
- **Ack with 2xx.** Any non-2xx (including 3xx) is treated as failure and retried; ~20 consecutive failures auto-disables the endpoint.
- **Public HTTPS:443 required.** The Anthropic console only accepts a public HTTPS endpoint — use **ngrok (or similar) for local dev**. Keep this route **unauthenticated/reachable** (auth is otherwise DEV-default-userId, but the webhook must not be gated).
- The webhook is the **completion source of truth** in the deploy path; the client just polls `GET /api/build/[id]/status` and, on `"ready"`, injects the `/d/[slug]` link.

## DELIVERY pattern: synchronous re-tail (DEV) vs fire-and-forget + webhook/poll (DEPLOY)

Both patterns reuse the **same idle session**; each refine (§8a) is a **NEW POST that re-attaches** to that idle session.

### DEV — synchronous re-tail (named)

Hold ONE connection open (`next dev` has no function timeout) and bridge agent events into a `useChat` assistant message ending with a persistent `data-artifact` part. No webhook/Redis needed. To resume/reconnect without losing or double-counting events, open a new stream, seed seen ids from history, then tail live skipping dupes:

```ts
const seen = new Set<string>();
const s = await client.beta.sessions.events.stream(session.id);
for await (const e of client.beta.sessions.events.list(session.id)) seen.add(e.id);
for await (const e of s) {
  if (seen.has(e.id)) continue;
  seen.add(e.id);
  // handle e ...
  if (e.type === "session.status_idle") break; // SSE present-tense name here
}
```

`client.beta.sessions.events.list(session.id, { types: ["agent.tool_use","agent.tool_result"] })` filters history by type. **Reconnect-tolerant, NOT exit-tolerant:** re-tailing survives a dropped connection, but a webhook firing *after* the producing function has exited CANNOT resolve an old `useChat` message — that is why deploy uses polling, not a lingering stream.

### DEPLOY — fire-and-forget + webhook + poll (named)

`/api/build` sends the build turn and returns fast. The build runs on Anthropic with no client connected. `/api/webhooks/anthropic` publishes the artifact (Blob + Mongo `status:"ready"`). The browser polls `GET /api/build/[id]/status`; on `"ready"` it injects the `/d/[slug]` link via `useChat` `setMessages()`. PLAN-AGNOSTIC (works on Hobby).

### Optional live-tail route (Pro/Fluid)

`GET /api/build/[sessionId]/stream` = an optional re-tailable live-progress endpoint (open the stream, seed seen ids via `events.list`, dedupe by id — same snippet as DEV). Optionally wrap in `resumable-stream@2.2.x` (`resume:true` + Redis). Same reconnect-tolerant / not-exit-tolerant caveat applies.

### Cleanup for abandoned / completed builds

```ts
// abandoned build: interrupt-if-running, then delete the session + the uploaded docx
if (sessionIsRunning) {
  await client.beta.sessions.events.send(session.id, { events: [{ type: "user.interrupt" }] });
}
await client.beta.sessions.delete(session.id); // removes record, events, sandbox (must be idle, not running)
await client.beta.files.delete(uploaded.id);   // delete the uploaded docx (use the persisted file_id)
```

`await client.beta.sessions.archive(session.id)` is the alt (freeze, keep history); `await client.beta.agents.archive(agent.id)` makes the agent read-only. Files, skills, environments, and agents are independent resources — deleting a session does NOT delete them. To delete a `running` session you MUST `user.interrupt` first.

## §9-custom-tools — tool confirmation & custom tools (the REJECTED askQuestion path)

If a tool has an `always_ask` permission policy, the session goes `idle` with `stop_reason.type === "requires_action"` and blocking ids in `stop_reason.event_ids`. Approve each:
```ts
await client.beta.sessions.events.send(session.id, {
  events: [{ type: "user.tool_confirmation", tool_use_id: eventId, result: "allow" }], // or "deny" + deny_message
});
```
Agent-side custom (client-executed) tools: the agent emits `agent.custom_tool_use`, the session idles with `requires_action`, and you reply per blocking id with `{ type: "user.custom_tool_result", custom_tool_use_id: eventId, content: [{ type: "text", text: result }] }`.

> **This agent-side custom-tool / `requires_action` flow is the REJECTED Option-2 mechanism for `askQuestion`.** We deliberately do NOT use it: clarify lives on the AI-SDK/Sonnet side (§8b), Opus runs autonomously. Furthermore, the **declaration shape for a custom tool on `agents.create` is NOT verified** — do not assume it and do not build the clarify loop on it. For DocToApp we need neither permission policies nor custom tools; the built-in toolset + docx/pdf skills cover parse + build.

## Gotchas / beta caveats

- **Webhook names are PAST-TENSE and differ from SSE.** Switch a webhook handler on `session.status_idled` (NOT `session.status_idle`). Hydrate via `events.list({ types: ["session.status_idle"] })` to read `stop_reason` (the webhook payload has none).
- **Fire-and-forget is safe** — closing the stream / function exit does not stop the build; events persist and are fetchable via `events.list`. Webhook = completion source of truth; client polls `GET /api/build/[id]/status`.
- **Prefer file-based handoff** — agent writes `schema.json` and `index.html` to `/mnt/session/outputs/`; route `files.list`+`download`s + validates. Never regex-scrape streamed `agent.message` text for the schema/HTML.
- **CLARIFY ≠ REFINE.** Clarify answers stay in Sonnet and only refine its schema view; Opus gets ONE build turn with the FINAL confirmed schema. Refines (post-build) are steered into the live idle session as new POSTs.
- **The agent-side custom-tool / `requires_action` path is the rejected askQuestion mechanism and its `agents.create` declaration shape is unverified** — don't use it (§9-custom-tools).
- **Not ZDR / not HIPAA-eligible.** Managed Agents is stateful (sessions, sandbox checkpoints, history retained server-side) so it is excluded from Zero Data Retention and BAA coverage. Fine for the hackathon/open-source MVP; flag before any Terapify patient-PHI productionization. You can `sessions.delete` and `files.delete` to purge (see cleanup).
- **Beta header on `client.beta.*` is automatic** — but `scope_id` on `files.list` needs `betas: ["managed-agents-2026-04-01"]` passed explicitly.
- **Skills live on the agent (`skills` field), not on the message/container.** The `container: { skills: [...] }` + `code_execution_20250825` shape is the Messages-API skills path — different product surface. Don't mix them here.
- **Networking controls sandbox egress only, not `web_fetch`/`web_search`.** Enum is `"unrestricted"` (default) or `"limited"` (+ `allowed_hosts`/`allow_package_managers`/`allow_mcp_servers`). Choose deliberately and verify before shipping.
- **Outputs only persist from `/mnt/session/outputs/`.** Bake this into the system prompt or you'll get an empty `files.list` (no `schema.json` and no `index.html`).
- **Uploaded files are not downloadable**; agent-created files are. Mount uploads via `resources`, retrieve creations via `files.list({scope_id})` + `files.download`. Verify the `files.download` return type against the installed `.d.ts` (see §7c defensive read).
- **Open stream before sending the first event.** Consume the returned `Stream` with `for await` — not `EventSourceParserStream`.
- **Webhook env + endpoint:** set `ANTHROPIC_WEBHOOK_SIGNING_KEY` (`whsec_...`); verify with `client.beta.webhooks.unwrap(raw, { headers })` over `raw = await req.text()`; dedupe by top-level `event.id`; ack 2xx (non-2xx incl 3xx → retried; ~20 fails auto-disables); console needs public HTTPS:443 (ngrok for dev); keep the route unauthenticated.
- Rate limits: create endpoints 300 rpm, read/stream 600 rpm per org. Files API ~100 rpm in beta.
- SDK method naming differs per language: TS is `client.beta.sessions.events.stream(...)` (Go is `StreamEvents`, Python is `events.stream(...)` as a context manager). Use the TS form above.
- Models: all Claude 4.5+ supported. BUILD ENGINE here = `claude-opus-4-8` (string) or `{ id: "claude-opus-4-8", speed: "fast" }`. The chat/orchestration brain (other skill) = `anthropic("claude-sonnet-4-6")`.
