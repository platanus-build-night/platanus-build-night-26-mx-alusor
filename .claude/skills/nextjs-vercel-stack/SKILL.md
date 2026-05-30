---
name: nextjs-vercel-stack
description: "Build the DocToApp web app correctly on the Next.js 16 + Vercel stack: streaming route handlers, .docx FormData upload to Vercel Blob, hosting a generated single-file index.html in Blob with a public /d/[slug] share route, Auth.js v5 (next-auth@beta) with Google + MongoDB adapter, and the cached MongoClient singleton for serverless. Use when wiring API routes, file upload/storage, the AI chat bridge route, auth gating, the public artifact viewer, or DB connections. Pinned to next@16.2.6, @vercel/blob@2.4.0, next-auth@5(beta), @auth/mongodb-adapter@3.11.2, mongodb@7.2.0, ai@6.0.193, @ai-sdk/react@3.0.195, @ai-sdk/anthropic@3.0.81."
---

# nextjs-vercel-stack (DocToApp)

The infra layer of DocToApp: Next.js 16 App Router routing/streaming, Vercel Blob storage, Auth.js v5, MongoDB. This file is the source of truth for **current** (May 2026) APIs. Several things changed in Next 16 / Auth.js v5 / AI SDK v6 from older versions — the "GOTCHAS / WHAT CHANGED" callouts below are the ones that actually break builds.

## Version pins (verified via `npm view`, May 2026)

```
next@16.2.6   react@19.2  react-dom@19.2
@vercel/blob@2.4.0
next-auth@beta            # == v5. DO NOT use next-auth@latest (4.24.14 = old v4)
@auth/mongodb-adapter@3.11.2
mongodb@7.2.0
ai@6.0.193  @ai-sdk/react@3.0.195  @ai-sdk/anthropic@3.0.81  @anthropic-ai/sdk@0.100.1
```

Install:
```bash
npm i next@16.2.6 react@latest react-dom@latest
npm i @vercel/blob next-auth@beta @auth/mongodb-adapter mongodb
npm i ai @ai-sdk/react @ai-sdk/anthropic @anthropic-ai/sdk
```

`package.json` scripts — **Turbopack is the default in 16**, drop the `--turbopack` flag:
```json
{ "scripts": { "dev": "next dev", "build": "next build", "start": "next start" } }
```

## Env vars (one .env.local)

```bash
# Auth.js v5 — note the AUTH_ prefix; the lib auto-reads these (no explicit clientId needed)
AUTH_SECRET=...                  # generate: npx auth secret
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
# MongoDB
MONGODB_URI="mongodb+srv://..."
# Vercel Blob: locally run `vercel env pull` to get this; on Vercel prefer OIDC (auto)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
# Anthropic (Managed Agent + AI SDK)
ANTHROPIC_API_KEY=sk-ant-...
# Webhook signature verification (completion source of truth)
ANTHROPIC_WEBHOOK_SIGNING_KEY=whsec_...
```

Google OAuth console redirect URI: `https://<host>/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google`).

---

## 0) CANON route map (single source of truth)

The build engine is an Anthropic **Managed Agent** (claude-opus-4-8, beta `managed-agents-2026-04-01`). It runs **async on Anthropic's infra** — events persist server-side and closing an SSE stream does NOT stop the build. The Next routes are thin glue around that. Everything is **plan-agnostic / Hobby-safe**: the build never blocks on the Vercel 60s function cap because it does not run inside a Vercel function.

| Route | Method | Responsibility |
|---|---|---|
| `/api/upload` | POST | docx FormData → **public** Vercel Blob + Mongo `documents` doc (`userId=DEV` default). Returns `{documentId, blobUrl}`. |
| `/api/parse` | POST | Download docx from Blob → Files API upload → create-or-reuse agent + cloud env → `sessions.create` mounting the file → **PARSE-ONLY** turn → Opus WRITES `/mnt/session/outputs/schema.json` → route `files.download()`s + **zod-validates** it → persist `{sessionId, agentId, schema, archetype}`. Returns the schema. **Session stays idle/alive.** |
| `/api/chat` | POST | **CLARIFY PHASE ONLY** — Sonnet `streamText` loop + the editable schema card + `<=3` `askQuestion` no-execute human-in-the-loop tool. **NEVER holds the build.** |
| `/api/build` | POST | **Fire-and-forget kickoff** + REFINE. Sends the build/refine `user.message` to the existing idle session, persists `{sessionId, slug, status:"building"}`, and **returns immediately** (Hobby-safe). |
| `/api/webhooks/anthropic` | POST | **COMPLETION SOURCE OF TRUTH.** Receives past-tense session events with no client connected, confirms `end_turn`, downloads `index.html`, publishes (Blob + Mongo `status:"ready"`). **Unauthenticated** (must stay reachable). |
| `/api/build/[id]/status` | GET | Returns `{status, artifactUrl}` from Mongo for client polling. |
| `/api/build/[sessionId]/stream` | GET | **OPTIONAL** re-tailable live-progress stream (Pro/Fluid). Not required for delivery. |
| `/d/[slug]` | page | **Public viewer** of the generated single-file app. (Route is `/d/[slug]`, NOT `/a/[slug]`.) |

> **CANON: `/api/chat` is CLARIFY-only.** Build and refine live on `/api/build`; completion is published by the webhook; progress (if any) is tailed via `/api/build/[sessionId]/stream` or polled via `/api/build/[id]/status`. The chat route never owns the build and never blocks on the 60s cap.

---

## 1) Cached MongoClient singleton (Next 16 / serverless)

Survives hot reload in dev and avoids exhausting connections across serverless invocations. `@auth/mongodb-adapter` needs a `MongoClient` **promise**. Export both the promise (for the adapter) and a `getDb()` helper (for app queries).

`lib/mongodb.ts`:
```ts
import { MongoClient, ServerApiVersion } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // Reuse across HMR via global to avoid new connections on every edit
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };
  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
export async function getDb(name = "doctoapp") {
  return (await clientPromise).db(name);
}
```

> GOTCHAS:
> - The adapter needs an **already-connecting** client — we export `client.connect()` (a promise), not the bare client. Auth.js docs say "you must pass the Adapter a MongoClient that is connected already."
> - `strict: true` in `serverApi` makes Mongo reject commands not in the Stable API. If you later use `$search`/Atlas-specific commands, set `strict: false`.
> - Never instantiate `MongoClient` at module scope without the global-cache guard in dev — Turbopack HMR will leak connections.
> - This module is server-only. Never import it into a `"use client"` file.

### sessionId persistence (re-attaching build/refine to the SAME idle session)

The whole pipeline depends on one long-lived idle Managed-Agent session created by `/api/parse`. Persist its identifiers in Mongo so later POSTs re-attach instead of spinning up a new session (which would lose the mounted docx + parsed schema):

- `/api/parse` writes `{ documentId, sessionId, agentId, schema, archetype }` to a Mongo `sessions` (or `builds`) doc. The session is left **idle/alive** on Anthropic.
- The CLARIFY client carries `sessionId` in the `useChat` transport **body** (`new DefaultChatTransport({ api, body: { sessionId } })`), and on Confirm POSTs `{ confirmedSchema, sessionId }` to `/api/build`.
- `/api/build` looks up / trusts that `sessionId`, sends the steering `user.message` to **that** session, and updates the same Mongo doc with `{ slug, status:"building" }`.
- A refine is just another `user.message` to the SAME `sessionId` (prepend `{type:"user.interrupt"}` only if mid-build).
- The webhook resolves everything by `sessionId` (`event.data.id`), so the Mongo doc must be keyed/indexed by `sessionId`.

---

## 2) Auth.js v5 (next-auth@beta) — full setup

> **AUTH IS A DEFERRED SEAM.** For the hackathon MVP, routes are NOT gated and `userId=DEV` is the default everywhere. Wire the structure below but leave the actual gating as a TODO. **The `/api/webhooks/anthropic` route MUST stay reachable unauthenticated** (Anthropic posts to it with no session), so never let the proxy matcher or any auth check cover it.

`auth.ts` (project root or `src/`):
```ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise, { databaseName: "doctoapp" }),
  providers: [Google], // reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET automatically
  session: { strategy: "jwt" }, // jwt works with the adapter and avoids a DB read per request
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
```

`app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

### proxy.ts — NOT middleware.ts (Next 16 rename)

> WHAT CHANGED (Next 16): `middleware.ts` is deprecated and renamed to **`proxy.ts`**; the exported function is `proxy`, not `middleware`. The `edge` runtime is NOT supported in `proxy` (it runs `nodejs`, not configurable). Auth.js docs already reflect this.

`proxy.ts` (project root):
```ts
export { auth as proxy } from "@/auth";
```

Gate `/dashboard`, keep `/d/[slug]`, `/api/webhooks/anthropic`, and auth routes public. Use `auth()` as a wrapper to read the session inside the proxy:

`proxy.ts` (gating variant):
```ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isProtected = pathname.startsWith("/dashboard");
  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/api/auth/signin", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  // Run on everything except static assets + the webhook (must stay unauthenticated).
  // /d/[slug] is left public by the logic above (only /dashboard redirects).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:png|jpg|svg)$).*)",
  ],
};
```

Reading session server-side (Server Component, Route Handler, Server Action) — just call `auth()`:
```ts
import { auth } from "@/auth";
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) { /* redirect('/api/auth/signin') */ }
  return <div>Hi {session?.user?.name}</div>;
}
```

Sign-in button (Server Action form — no client JS needed):
```tsx
import { signIn } from "@/auth";
export function SignIn() {
  return (
    <form action={async () => { "use server"; await signIn("google", { redirectTo: "/dashboard" }); }}>
      <button type="submit">Sign in with Google</button>
    </form>
  );
}
```

> GOTCHAS:
> - Env vars are `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` (v5 convention). The old v4 `GOOGLE_CLIENT_ID` / `NEXTAUTH_URL` / `NEXTAUTH_SECRET` names are gone; secret is `AUTH_SECRET`.
> - v5 exports `{ handlers, signIn, signOut, auth }` from one `NextAuth()` call. There is no `getServerSession`; use `auth()` everywhere on the server.
> - Adapter signature: `MongoDBAdapter(clientPromise, options?)`. Pass the **promise** from `lib/mongodb.ts`, not `client`.
> - The proxy keeps the session alive (rolls expiry). Keep the matcher from hitting `/_next` static assets or you'll pay auth cost on every asset — **and from hitting `/api/webhooks`** or the webhook will get bounced.

---

## 3) Streaming POST route handler (Route Handler basics + AI SDK bridge)

> WHAT CHANGED (Next 16): in `route.ts` the dynamic `params` arg is now a **Promise** — `await params`. Use the global `RouteContext<'/path'>` helper (no import) for typing. `GET` handlers default to **dynamic** caching since 15. The old `StreamingTextResponse` from `ai` is **removed** in v6 — do not use it (older Next docs still show it).

### 3a) Plain streaming with raw Web APIs (no AI SDK)

`app/api/stream/route.ts`:
```ts
export const runtime = "nodejs";        // default; set explicitly if you need Node APIs (Buffer, mongodb)
export const dynamic = "force-dynamic"; // don't cache a stream

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode("chunk 1\n"));
      await new Promise((r) => setTimeout(r, 200));
      controller.enqueue(encoder.encode("chunk 2\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

### 3b) AI SDK v6 chat route = the DocToApp `/api/chat` (CLARIFY PHASE ONLY)

`/api/chat` is the **Sonnet orchestrator** for the CLARIFY phase: it streams the editable schema card and runs the `askQuestion` human-in-the-loop tool. It NEVER touches the Managed Agent build and NEVER holds a connection open for the build. Basic shape (v6):
```ts
// app/api/chat/route.ts  — CLARIFY ONLY
import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages, type UIMessage } from "ai";

export const maxDuration = 60; // CLARIFY is short — Hobby's 60s is plenty; the build is elsewhere

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const result = streamText({
    model: anthropic("claude-sonnet-4-6"), // ORCHESTRATOR brain (NOT the build engine)
    messages: await convertToModelMessages(messages), // v6: convertToModelMessages is ASYNC — await it
    // tools: { askQuestion }  // AI-SDK-side no-execute tool — see vercel-ai-sdk-v6 skill
  });
  return result.toUIMessageStreamResponse();
}
```

> WHAT CHANGED (AI SDK v6): client sends `UIMessage[]`; `convertToModelMessages` is **async** in v6 — you must `await convertToModelMessages(messages)` before passing the result to `streamText`. Return `result.toUIMessageStreamResponse()` (the v5 `toDataStreamResponse` / v4 `StreamingTextResponse` names are gone). `streamText` itself is NOT awaited.

> The `askQuestion` tool, the editable `data-schema` part, and steering answers all stay **inside Sonnet** and only refine the schema view. They are NOT forwarded one-by-one into Opus. Opus receives ONE clean build steering turn with the FINAL confirmed schema via `/api/build`. The tool wiring is owned by `vercel-ai-sdk-v6`; do not invent an agent-side `askQuestion`.

### 3c) `/api/build` — fire-and-forget kickoff + REFINE (the CANON build delivery)

This is the route that starts (and steers) the build. It does **not** stream the build to the client. It sends one `user.message` to the existing idle session, flips Mongo to `building`, and returns fast — the build runs on Anthropic, and `/api/webhooks/anthropic` publishes the result with no client connected.

```ts
// app/api/build/route.ts
import { getDb } from "@/lib/mongodb";
import { sendBuildTurn } from "@/lib/agent"; // owned by claude-managed-agents skill

export const runtime = "nodejs";
export const maxDuration = 60; // Hobby-safe: we RETURN immediately; the build is NOT held here

export async function POST(req: Request) {
  const { confirmedSchema, sessionId, refine } = await req.json();

  // Re-attach to the SAME idle session created by /api/parse (persisted in Mongo).
  // KICKOFF: a build steering turn embedding the verbatim confirmed schema.
  // REFINE:  another user.message to the same session; prepend {type:"user.interrupt"}
  //          ONLY if a build is mid-flight.
  await sendBuildTurn({ sessionId, confirmedSchema, refine });

  const db = await getDb();
  const slug = crypto.randomUUID().slice(0, 8);
  await db.collection("builds").updateOne(
    { sessionId },
    { $set: { sessionId, slug, status: "building", updatedAt: new Date() } },
    { upsert: true }
  );

  // RETURN IMMEDIATELY — Hobby-safe. Completion arrives via the webhook.
  return Response.json({ sessionId, slug, status: "building" });
}
```

> **CANON BUILD DELIVERY (plan-agnostic, Hobby-safe):**
> 1. `/api/build` fires the steering turn and returns fast. The build runs **on Anthropic**, so the Vercel 60s cap never blocks it.
> 2. `/api/webhooks/anthropic` is the **completion source of truth**: it fires with NO client connected, confirms the build is done, downloads `index.html`, and publishes (Blob + Mongo `status:"ready"`). See §6.
> 3. The browser **polls** `GET /api/build/[id]/status` and, on `"ready"`, injects the `/d/[slug]` link via `useChat` `setMessages()`.
>
> **The held-tail + resumable-stream pattern is the DEV convenience, and an OPTIONAL Pro/Fluid live-tail — NOT a requirement.** In `next dev` there is no function timeout, so you can hold ONE connection open and bridge agent events into a `useChat` assistant message ending in a `data-artifact` part (no webhook/Redis needed). On Vercel, an optional Pro/Fluid live-tail is `GET /api/build/[sessionId]/stream` (re-tail: open the stream, seed seen ids via `events.list`, dedupe by id), optionally wrapped in `resumable-stream@2.2.x` (`resume:true` + Redis). **Caveat:** a resumable stream is reconnect-tolerant, NOT exit-tolerant — a webhook firing AFTER the producing function has exited cannot resolve an already-closed `useChat` message, so the poll-the-status path (not the stream) is what actually delivers the artifact in production.

### 3d) OPTIONAL live-tail bridge (DEV / Pro Fluid only) — Claude Managed Agent → AI SDK UI stream

This is the **optional** path: hold one connection open and bridge the agent's async-iterable `Stream` (from `client.beta.sessions.events.stream(sessionId)`) into a `createUIMessageStream`. The **agent-event → UIMessageChunk mapping is owned by the `claude-managed-agents` skill — defer to its CANON and do not re-derive event names here.** Verified present-tense SSE event names (distinct from the past-tense webhook names in §6):

- `ev.type==="agent.message"` → assistant text: iterate `ev.content` blocks, for `block.type==="text"` emit `text-delta`.
- `ev.type==="agent.tool_use"` → tool invoked (`ev.name`); surface as a transient `data-tool` part.
- `ev.type==="agent.tool_result"` → tool result (cloud feeds it back automatically).
- `ev.type==="session.status_idle"` with `ev.stop_reason?.type==="end_turn"` → turn done: close the text part and `break`.
- `ev.type==="session.error"` → `writer.write({type:"error",errorText:ev.error?.message})` and `break`.

There is **no agent-side `askQuestion` tool**. This route's only job is the **Next-side glue**: open the session stream, bridge each event via the canon mapping into a `createUIMessageStream`, and return `createUIMessageStreamResponse`.

```ts
// app/api/build/[sessionId]/stream/route.ts  (OPTIONAL live-tail; DEV or Pro Fluid)
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { reTailSession } from "@/lib/agent"; // owned by claude-managed-agents skill

export const runtime = "nodejs";
export const maxDuration = 800; // DEV has no cap; on Vercel this needs Pro/Fluid. NOT required for delivery.

export async function GET(_req: Request, ctx: RouteContext<"/api/build/[sessionId]/stream">) {
  const { sessionId } = await ctx.params;

  const stream = createUIMessageStream({
    async execute({ writer }) {
      // re-tail: open the stream, seed seen ids via events.list, dedupe by id (claude-managed-agents owns this)
      const { agentStream } = await reTailSession({ sessionId });

      const textId = crypto.randomUUID();
      let textOpen = false;

      for await (const ev of agentStream) {
        if (ev.type === "agent.message") {
          for (const block of ev.content ?? []) {
            if (block.type !== "text") continue;
            if (!textOpen) { writer.write({ type: "text-start", id: textId }); textOpen = true; }
            writer.write({ type: "text-delta", id: textId, delta: block.text });
          }
        } else if (ev.type === "agent.tool_use") {
          writer.write({ type: "data-tool", data: { name: ev.name }, transient: true });
        } else if (ev.type === "session.status_idle" && ev.stop_reason?.type === "end_turn") {
          if (textOpen) { writer.write({ type: "text-end", id: textId }); textOpen = false; }
          // DEV-only convenience: publish here and emit the artifact part (see §5). In PROD the
          // webhook (§6) is the source of truth — do NOT rely on this branch on Vercel.
          break;
        } else if (ev.type === "session.error") {
          writer.write({ type: "error", errorText: ev.error?.message ?? "agent error" });
          break;
        }
      }
      if (textOpen) writer.write({ type: "text-end", id: textId });
    },
    onError: (e) => `Agent error: ${e instanceof Error ? e.message : String(e)}`,
  });

  return createUIMessageStreamResponse({ stream });
}
```

UI message chunk part types (the protocol the client parses):
- text: `{ type:"text-start", id }` → `{ type:"text-delta", id, delta }` → `{ type:"text-end", id }`. **`id` MUST be identical across the trio.**
- custom data: `{ type:"data-<name>", data, id? }` (e.g. `data-tool`, `data-artifact`, `data-schema`). Reusing an `id` reconciles/overwrites; omit it to append. Add `transient:true` for parts that should not persist in message history.
- error: `{ type:"error", errorText }`.
- tool parts (AI-SDK-side tools like `askQuestion`): `tool-input-start` / `tool-input-delta` / `tool-input-available` / `tool-output-available`.
- merge a whole AI-SDK sub-stream with `writer.merge(result.toUIMessageStream())`.

### 3e) Client — CLARIFY chat + status polling for the artifact

The CLARIFY surface uses `useChat` against `/api/chat`. The **artifact does NOT arrive over the chat stream** in the CANON delivery — it arrives by polling `GET /api/build/[id]/status` and injecting the `/d/[slug]` link via `setMessages()`.

```tsx
"use client";
import { useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";       // useChat is from @ai-sdk/react
import { DefaultChatTransport } from "ai";       // DefaultChatTransport is from "ai", NOT @ai-sdk/react

export function Chat({ sessionId }: { sessionId: string }) {
  const [input, setInput] = useState(""); // v6: manage input yourself
  const { messages, sendMessage, status, stop, addToolOutput, setMessages } = useChat({
    // sessionId travels in the transport BODY so server routes re-attach to the same idle session
    transport: new DefaultChatTransport({ api: "/api/chat", body: { sessionId } }),
  });

  // CANON delivery: kick off the build via /api/build, then POLL status for the artifact.
  async function confirmAndBuild(confirmedSchema: unknown) {
    const { slug } = await fetch("/api/build", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmedSchema, sessionId }),
    }).then((r) => r.json());

    const timer = setInterval(async () => {
      const { status, artifactUrl } = await fetch(`/api/build/${sessionId}/status`).then((r) => r.json());
      if (status === "ready") {
        clearInterval(timer);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant",
            parts: [{ type: "data-artifact", data: { slug, url: artifactUrl } }] },
        ]);
      } else if (status === "error") {
        clearInterval(timer);
      }
    }, 2500);
  }

  return (
    <>
      {messages.map((m) => (
        <div key={m.id}>
          {m.parts.map((part, i) => {
            if (part.type === "text") return <span key={i}>{part.text}</span>;
            if (part.type === "data-artifact")
              // url is the /d/[slug] share link the webhook published
              return <a key={i} href={(part.data as any).url}>Open your app</a>;
            if (part.type === "data-tool")
              return <em key={i}>running {(part.data as any).name}…</em>;
            // editable schema card (CLARIFY): persistent data-schema part written by Sonnet
            if (part.type === "data-schema")
              return <SchemaCard key={i} schema={(part.data as any)} onConfirm={confirmAndBuild} />;
            // AI-SDK-side human-in-the-loop tool: no execute fn -> input-available -> collect answer
            if (part.type === "tool-askQuestion" && part.state === "input-available")
              return (
                <QuestionUI
                  key={i}
                  q={part.input}
                  onAnswer={(answer) =>
                    addToolOutput({ tool: "askQuestion", toolCallId: part.toolCallId, output: answer })
                  }
                  onError={(msg) =>
                    addToolOutput({
                      tool: "askQuestion",
                      toolCallId: part.toolCallId,
                      state: "output-error",
                      errorText: msg,
                    })
                  }
                />
              );
            return null;
          })}
        </div>
      ))}
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button
        onClick={() => { sendMessage({ text: input }); setInput(""); }}
        disabled={status === "submitted" || status === "streaming"}
      >Send</button>
      {status === "streaming" && <button onClick={stop}>Stop</button>}
    </>
  );
}
```

> Human-in-the-loop (`askQuestion`): resolve the AI-SDK-side tool call with `addToolOutput({ tool, toolCallId, output })` (success) or `addToolOutput({ tool, toolCallId, state:"output-error", errorText })` (failure). `addToolResult` is **@deprecated** — do not use it. With `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls` configured, the answer auto-resubmits to `/api/chat` and refines Sonnet's schema view (it is NOT steered into Opus).

> OPTIONAL DEV/Pro live-tail: instead of (or in addition to) polling, open an `EventSource` / `useChat` against `/api/build/[sessionId]/stream` to show live progress. Remember the resumable-stream caveat in §3c — it is the poll-the-status path that guarantees delivery in production.

---

## 4) .docx upload via FormData → Vercel Blob (`/api/upload`)

> WHAT CHANGED (@vercel/blob v2): `access` is **required** and is `'private' | 'public'`. `put()` returns `{ url, downloadUrl, pathname, contentType, contentDisposition, etag }`. Default refuses to overwrite an existing pathname (throws) — use `addRandomSuffix: true` (recommended) or `allowOverwrite: true`.

`app/api/upload/route.ts` — returns `{documentId, blobUrl}` per the CANON route map:
```ts
import { put } from "@vercel/blob";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs"; // Buffer + mongodb need Node runtime, not edge

export async function POST(req: Request) {
  // AUTH DEFERRED: userId=DEV default; route not gated for the MVP.
  const userId = "DEV";

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });

  // .docx MIME is application/vnd.openxmlformats-officedocument.wordprocessingml.document
  if (!file.name.endsWith(".docx")) return Response.json({ error: "Only .docx" }, { status: 415 });

  // put() accepts a File/Blob/ArrayBuffer/string/ReadableStream directly — pass the File.
  const blob = await put(`uploads/${file.name}`, file, {
    access: "public", // public store: anyone with the URL can read; use 'private' for PHI
    addRandomSuffix: true,
    contentType: file.type ||
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const db = await getDb();
  const doc = await db.collection("documents").insertOne({
    userId,
    filename: file.name,
    blobUrl: blob.url,
    pathname: blob.pathname,
    createdAt: new Date(),
  });

  return Response.json({ documentId: doc.insertedId, blobUrl: blob.url });
}
```

Client uploader (FormData; do NOT set Content-Type manually — the browser sets the multipart boundary):
```tsx
const fd = new FormData();
fd.append("file", fileInput.files![0]);
const res = await fetch("/api/upload", { method: "POST", body: fd });
const { documentId, blobUrl } = await res.json();
```

> GOTCHAS:
> - `file` from `formData.get("file")` is a `File` (a `Blob`). Pass it straight to `put()`. Only convert to Buffer (`Buffer.from(await file.arrayBuffer())`) if you need to feed bytes to the docx skill / Anthropic Files API (that happens in `/api/parse`, §4b).
> - Vercel server-upload request body limit on the Function still applies; for files >100MB use `multipart: true` or client uploads (`@vercel/blob/client` `upload()` + `handleUpload`).
> - `runtime` must be `nodejs` (default) here — `mongodb` and `Buffer` are not available on edge.
> - **Choose store access at store-creation time; it's immutable.** PHI/sensitive patient docs → create a **private** store and serve via your function with `get()`. The shareable patient app below assumes a **public** store.

### 4b) `/api/parse` — file-based schema.json handoff (the CANON parse phase)

`/api/parse` downloads the docx from Blob, hands it to the Managed Agent (claude-opus-4-8 + docx skill — the ONLY thing that can parse the docx), and gets back a validated intermediate JSON schema via a **file-based handoff**. The agent **WRITES** the schema to `/mnt/session/outputs/schema.json`; the route `files.download()`s and **zod-validates** it. **NEVER regex-scrape streamed `agent.message` text for the schema.** The session is created here and left **idle/alive** for the later build.

The agent/session lifecycle (Files API upload, `agents.create` create-or-reuse, cloud env, `sessions.create` mounting `file_id` at `/mnt/session/uploads/template.docx`, opening `events.stream` BEFORE `send`, the PARSE-ONLY user message, `files.list`/`files.download` of `schema.json`) is owned by the **`claude-managed-agents`** skill — defer to its CANON. The Next-side responsibilities:

```ts
// app/api/parse/route.ts
import { getDb } from "@/lib/mongodb";
import { parseDocxToSchema } from "@/lib/agent"; // owned by claude-managed-agents skill
import { schemaZod } from "@/lib/schema";        // zod validator for the intermediate schema

export const runtime = "nodejs";
export const maxDuration = 800; // parse holds a stream until end_turn; on Vercel needs Pro/Fluid. DEV: no cap.

export async function POST(req: Request) {
  const { documentId } = await req.json();
  const db = await getDb();
  const docu = await db.collection("documents").findOne({ _id: documentId });
  if (!docu) return Response.json({ error: "unknown document" }, { status: 404 });

  // claude-managed-agents owns all of this and returns the schema.json bytes it downloaded:
  //  - download docx from docu.blobUrl
  //  - Files API client.beta.files.upload(toFile(...))
  //  - create-or-reuse agent + cloud env
  //  - sessions.create mounting file_id at /mnt/session/uploads/template.docx
  //  - open events.stream BEFORE send
  //  - PARSE-ONLY turn: "read template.docx with the docx skill, infer our intermediate JSON
  //    schema, WRITE it to /mnt/session/outputs/schema.json, do NOT build"
  //  - on end_turn: files.list({scope_id:session.id, betas:["managed-agents-2026-04-01"]})
  //                 + files.download schema.json
  const { sessionId, agentId, schemaJson } = await parseDocxToSchema({ blobUrl: docu.blobUrl });

  // ZOD-VALIDATE the downloaded file (file-based handoff — never scrape streamed text).
  const parsed = schemaZod.safeParse(JSON.parse(schemaJson));
  if (!parsed.success) {
    return Response.json({ error: "schema failed validation", issues: parsed.error.issues }, { status: 422 });
  }
  const schema = parsed.data;
  const archetype = (schema as any).archetype ?? null;

  // Persist so CLARIFY/build/refine re-attach to the SAME idle session (see §1 sessionId persistence).
  await db.collection("builds").updateOne(
    { sessionId },
    { $set: { documentId, sessionId, agentId, schema, archetype, status: "parsed", updatedAt: new Date() } },
    { upsert: true }
  );

  // The schema seeds CLARIFY as a persistent data-schema part (writer.write({type:"data-schema", id:"schema", data})).
  return Response.json({ sessionId, agentId, schema, archetype });
}
```

> GOTCHAS:
> - The handoff is **file-based**: Opus writes `/mnt/session/outputs/schema.json`, the route downloads + zod-validates it. Do NOT parse `agent.message` text.
> - The session is left **idle/alive** after parse — `/api/build` re-attaches to the same `sessionId`. Persist `{sessionId, agentId}` in Mongo (§1).
> - `betas: ["managed-agents-2026-04-01"]` is passed explicitly on the `files.list({scope_id:session.id})` call (the one place it isn't auto-set on `client.beta.*`).
> - The validated schema becomes the CLARIFY editable card via a **persistent** `data-schema` part (`id:"schema"`, reuse the id to overwrite on edits, omit `transient`).

---

## 5) Put generated index.html into Blob + public `/d/[slug]` viewer

The Managed Agent produces a self-contained `index.html` string. Store it in a **public** Blob and serve a stable shareable link at `/d/[slug]`.

Helper to publish (called from the **webhook** §6 when the build finishes — and, in DEV only, from the optional live-tail §3d):
```ts
// lib/publish.ts
import { put } from "@vercel/blob";
import { getDb } from "@/lib/mongodb";

export async function publishArtifact(html: string, slug: string) {
  const blob = await put(`artifacts/${slug}/index.html`, html, {
    access: "public",
    contentType: "text/html; charset=utf-8",
    addRandomSuffix: false, // we own the slug; keep the pathname stable
    // allowOverwrite: true,  // only if a slug may be re-published (refine)
  });
  await getDb().then((db) =>
    db.collection("builds").updateOne(
      { slug },
      { $set: { slug, blobUrl: blob.url, status: "ready", updatedAt: new Date() } },
      { upsert: true }
    )
  );
  return { slug, url: `/d/${slug}` }; // public viewer route; blob.url is the raw CDN URL
}
```

`app/d/[slug]/page.tsx` — public viewer (left out of the auth matcher):
```tsx
import { getDb } from "@/lib/mongodb";
import { notFound } from "next/navigation";

// Next 16: params is a Promise — await it.
export default async function ArtifactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = await getDb();
  const art = await db.collection("builds").findOne({ slug });
  if (!art?.blobUrl) notFound();

  // Iframe the public blob URL so the single-file app (its own JS/localStorage) is isolated.
  return (
    <iframe
      src={art.blobUrl}
      style={{ width: "100vw", height: "100vh", border: "none" }}
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  );
}
```

Alternative — proxy the HTML through a Route Handler (lets you serve private blobs or rewrite headers):
```ts
// app/d/[slug]/route.ts  (use EITHER page.tsx OR route.ts at this path, not both)
import { getDb } from "@/lib/mongodb";

export async function GET(_req: Request, ctx: RouteContext<"/d/[slug]">) {
  const { slug } = await ctx.params;        // Promise in Next 16
  const db = await getDb();
  const art = await db.collection("builds").findOne({ slug });
  if (!art?.blobUrl) return new Response("Not found", { status: 404 });
  const html = await fetch(art.blobUrl).then((r) => r.text());
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
```

> GOTCHAS:
> - `crypto.randomUUID()` is available in the Node + edge runtimes globally; no import.
> - iframe `sandbox="allow-scripts allow-same-origin allow-forms"` — the patient app needs scripts + localStorage (same-origin) to persist answers. Drop `allow-same-origin` only if the app doesn't use localStorage.
> - Blob CDN cache: overwriting the same pathname can take up to 60s to propagate and browsers may serve stale. For the immutable-artifact model, keep `addRandomSuffix:false` + unique slug and never overwrite; if a refine must re-publish, bust with `?v=<ts>` or use `allowOverwrite:true` and accept the propagation delay.
> - Keep `/d/...` OUT of the auth matcher (the regex in §2 already excludes static + `/api/webhooks`; `/d/[slug]` is public because the proxy only redirects `/dashboard`).
> - The client links to **`/d/[slug]`**, never the raw `blob.url` — keeps the share link stable and lets you gate/track later.

---

## 6) `/api/webhooks/anthropic` — completion SOURCE OF TRUTH

This route is how the artifact reaches the user in production: the Managed Agent build runs on Anthropic with **no client connected**, and Anthropic POSTs a past-tense session event here when the session idles. The webhook confirms the build is done, downloads `index.html`, publishes (Blob + Mongo `status:"ready"`), and the browser learns about it by polling `/api/build/[id]/status`.

**Webhook facts (verified live):** webhook event names are **past-tense** and DIFFER from the present-tense SSE names in §3d. Subscribe to `data.type = "session.status_idled"` (completion OR pause signal) and `"session.status_terminated"` (terminal error). The payload is **THIN**: `{type:"event", id:"event_...", created_at, data:{type:"session.status_idled", id:"sesn_...", organization_id, workspace_id}}` — `event.data.type` is the event type, `event.data.id` is the **SESSION id**, and there is **NO `stop_reason` in the payload**. So on `session.status_idled` you MUST call `client.beta.sessions.events.list(sessionId, {types:["session.status_idle"]})` and read the latest event's `stop_reason.type` to distinguish `end_turn` (build done → publish) from `requires_action` (pause).

```ts
// app/api/webhooks/anthropic/route.ts  — UNAUTHENTICATED (keep out of the auth matcher, §2)
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/lib/mongodb";
import { publishArtifact } from "@/lib/publish";

export const runtime = "nodejs"; // need raw bytes + Buffer + mongodb

const client = new Anthropic(); // ANTHROPIC_API_KEY from env

export async function POST(req: Request) {
  // Verify+parse with the RAW request bytes — do NOT JSON.parse first.
  const raw = await req.text();
  let event: any;
  try {
    // throws on bad signature or >5min-stale; uses ANTHROPIC_WEBHOOK_SIGNING_KEY (whsec_)
    event = await client.beta.webhooks.unwrap(raw, { headers: Object.fromEntries(req.headers) });
  } catch {
    return new Response("bad signature", { status: 400 }); // 4xx is fine; only non-2xx is retried
  }

  const db = await getDb();

  // Idempotency: dedupe on the TOP-LEVEL event.id (retries reuse it).
  const seen = await db.collection("webhook_events").findOne({ _id: event.id });
  if (seen) return new Response("ok", { status: 200 });
  await db.collection("webhook_events").insertOne({ _id: event.id, at: new Date() });

  const sessionId: string = event.data.id; // event.data.id is the SESSION id

  switch (event.data.type) {
    case "session.status_idled": {
      // THIN payload has no stop_reason — list events to confirm end_turn vs requires_action (pause).
      const events = await client.beta.sessions.events.list(sessionId, {
        types: ["session.status_idle"],
        betas: ["managed-agents-2026-04-01"],
      });
      const latest = events.data?.[0]; // newest first (verify ordering vs installed SDK — see caveats)
      const stop = latest?.stop_reason?.type;
      if (stop !== "end_turn") break; // requires_action = pause; not a completion — ack and wait

      // build done -> fetch index.html from the session's output files
      const files = await client.beta.files.list({
        scope_id: sessionId,
        betas: ["managed-agents-2026-04-01"],
      });
      const indexFile = files.data.find((f) => f.filename.endsWith("index.html"));
      if (!indexFile) {
        await db.collection("builds").updateOne(
          { sessionId },
          { $set: { status: "error", error: "no index.html", updatedAt: new Date() } }
        );
        break;
      }

      // download() return shape varies by SDK build — read defensively (verify vs installed .d.ts)
      const content = await client.beta.files.download(indexFile.id);
      let buf: Buffer;
      if (typeof (content as any).arrayBuffer === "function") {
        buf = Buffer.from(await (content as any).arrayBuffer()); // Response-like (primary)
      } else {
        const chunks: Buffer[] = [];                              // Node Readable fallback
        for await (const c of content as any) chunks.push(Buffer.from(c));
        buf = Buffer.concat(chunks);
      }
      const html = buf.toString("utf-8");

      // resolve the slug we reserved at kickoff (§3c), publish public Blob + Mongo status:"ready"
      const build = await db.collection("builds").findOne({ sessionId });
      const slug = build?.slug ?? crypto.randomUUID().slice(0, 8);
      await publishArtifact(html, slug); // sets blobUrl + status:"ready" on the builds doc
      break;
    }
    case "session.status_terminated": {
      await db.collection("builds").updateOne(
        { sessionId },
        { $set: { status: "error", updatedAt: new Date() } }
      );
      break;
    }
    // other past-tense events (run_started, rescheduled, thread_*, outcome_evaluation_ended) -> ignore
  }

  return new Response("ok", { status: 200 }); // return 2xx to ack; ~20 consecutive fails auto-disables
}
```

`GET /api/build/[id]/status` — what the client polls:
```ts
// app/api/build/[sessionId]/status/route.ts
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/build/[sessionId]/status">) {
  const { sessionId } = await ctx.params;
  const db = await getDb();
  const build = await db.collection("builds").findOne({ sessionId });
  if (!build) return Response.json({ status: "unknown" }, { status: 404 });
  return Response.json({
    status: build.status,                                   // building | ready | error
    artifactUrl: build.slug ? `/d/${build.slug}` : null,    // the public viewer link
  });
}
```

> GOTCHAS / WEBHOOK CANON:
> - **`unwrap` takes RAW bytes** (`await req.text()`), not a parsed object. App Router has no body-parser, so this is natural — just don't read `req.json()` first or you lose the bytes for signature verification.
> - **`headers` shape:** pass `Object.fromEntries(req.headers)` (a plain object). Whether `unwrap` also accepts a `Headers` instance directly in this SDK build is unverified — see caveats.
> - **Idempotency** on the top-level `event.id` (retries reuse it). Dedupe before doing work.
> - **Return 2xx to ack.** Non-2xx (including 3xx) gets retried; ~20 consecutive failures auto-disables the endpoint. A bad signature returning 400 is correct (you WANT that dropped).
> - The webhook must be reachable at **public HTTPS:443** (Anthropic Console requirement). For dev, expose `next dev` via ngrok. Keep it **unauthenticated** (out of the §2 matcher).
> - Webhook event names are **past-tense** (`session.status_idled`, `session.status_terminated`) — distinct from the present-tense SSE names (`session.status_idle`) used by the optional live-tail (§3d). Do not mix them.

---

## Next 16 / React 19 quick-reference (things that bite)

- **Async request APIs are now mandatory** (sync access fully removed): `await cookies()`, `await headers()`, `await draftMode()`, `await params`, `await searchParams` in pages/layouts/route handlers/metadata. In Client Component pages use `use(params)` from React.
- **`middleware.ts` → `proxy.ts`** (`export const proxy` / `export { auth as proxy }`); proxy runs `nodejs`, edge not supported there.
- **Turbopack is default** for `next dev` and `next build`; remove `--turbopack`. A stray `webpack` config in `next.config` makes `build` fail — use `--webpack` to opt out.
- **React 19.2** (Canary features). Node **20.9+** required, TypeScript **5.1+**.
- **`next lint` removed** — run ESLint/Biome directly; `next build` no longer lints.
- **`serverRuntimeConfig`/`publicRuntimeConfig` removed** — use `process.env` / `NEXT_PUBLIC_*`; call `await connection()` from `next/server` before reading runtime-only env in a prerenderable component.
- **`revalidateTag(tag)` now requires a 2nd arg** (`revalidateTag('x','max')`); new `updateTag` (read-your-writes) and `refresh` Server-Action APIs. `cacheLife`/`cacheTag` stable (drop `unstable_`).
- Type helpers (generated by `next dev`/`next build`/`next typegen`, globally available, no import): `PageProps<'/route'>`, `LayoutProps<'/route'>`, `RouteContext<'/route'>`.
- Parallel-route slots now require a `default.js`.
- **`next dev` has no function timeout** (so DEV can hold the parse/live-tail stream open); on Vercel, **Hobby caps functions at 60s** — which is fine because the CANON build delivery returns from `/api/build` immediately and publishes via the webhook, so the build runs on Anthropic and never blocks on the cap. A long-held stream (parse §4b, optional live-tail §3d) needs Pro/Fluid in production.
- AI SDK v6: `await convertToModelMessages(messages)` (it's **async**) + `toUIMessageStreamResponse()`; client uses `useChat` (from `@ai-sdk/react`) with `new DefaultChatTransport({ api, body })` (`DefaultChatTransport` is from **`ai`**, not `@ai-sdk/react`); pass `sessionId` in the transport `body` so build/refine re-attach to the same idle session; messages are `parts[]` (`text`, `data-*`, tool parts), no `.content`; `status` is `submitted|streaming|ready|error`; manage input via your own `useState` and call `sendMessage({ text })`. Resolve human-in-the-loop tools with `addToolOutput({tool,toolCallId,output})` (or `{state:"output-error",errorText}`) — `addToolResult` is **@deprecated**. `StreamingTextResponse`/`toDataStreamResponse` are gone.