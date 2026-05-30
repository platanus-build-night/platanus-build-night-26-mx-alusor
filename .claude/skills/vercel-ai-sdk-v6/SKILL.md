---
name: vercel-ai-sdk-v6
description: "Build chat UIs and streaming API routes with Vercel AI SDK v6 (ai@6, @ai-sdk/react@3, @ai-sdk/anthropic@3) in a Next.js 16 App Router project. Use when wiring useChat, a /api/chat route with streamText + toUIMessageStreamResponse, defining tools with tool()+zod inputSchema, rendering Generative UI from message.parts, implementing a human-in-the-loop askQuestion tool (no-execute + addToolOutput), or bridging an external event stream (e.g. an Anthropic Managed Agent's async-iterable Stream) into the AI SDK UI message stream via createUIMessageStream / a custom ChatTransport. Note: v6 replaced the v4/v5 message.content/append/handleSubmit APIs with message.parts + sendMessage; if you see those older shapes, this skill has the current code."
---

# Vercel AI SDK v6 (DocToApp)

Verified against **ai@6.0.193, @ai-sdk/react@3.0.195, @ai-sdk/anthropic@3.0.81** (May 2026), Next.js 16 App Router. All code below typechecks against these versions (`tsc --strict`). Re-confirm with `npm view ai version`.

## Where useChat lives in DocToApp (READ FIRST)

`useChat` here owns the **CLARIFY phase only** — the Sonnet orchestration brain: it renders the editable schema card, drives the `askQuestion` human-in-the-loop tool, and emits the confirmed schema. It does **NOT** own the BUILD phase. The build runs on a Managed Agent (Opus) asynchronously on Anthropic and is reported back via polling + `setMessages()` injection (see section 7), **not** via a `useChat`-owned stream. Internalize this split before wiring anything:

- **CLARIFY (this skill, useChat + Sonnet):** parse result → `data-schema` editable card → `askQuestion` round-trips → user confirms.
- **BUILD (NOT a useChat stream):** `/api/build` fires-and-forgets the kickoff turn to the Managed Agent, returns immediately; a webhook publishes the artifact later; the client **polls** status and injects the final `data-artifact` part with `setMessages()`.

## Packages & imports

```bash
npm i ai@6 @ai-sdk/react@3 @ai-sdk/anthropic@3 zod
```

- Server + shared types/helpers come from `ai` (`streamText`, `tool`, `convertToModelMessages`, `stepCountIs`, `createUIMessageStream`, `createUIMessageStreamResponse`, `DefaultChatTransport`, `lastAssistantMessageIsCompleteWithToolCalls`, all the `UI*` types). `tool`/`dynamicTool`/`jsonSchema`/`parseJsonEventStream` are re-exported by `ai` from `@ai-sdk/provider-utils`.
- Client hook from `@ai-sdk/react`: `import { useChat } from '@ai-sdk/react'`.
- Provider: `import { anthropic } from '@ai-sdk/anthropic'` then `anthropic('claude-sonnet-4-6')` (or `createAnthropic({ apiKey })`). The `'anthropic/claude-sonnet-4-6'` slash-form string only works via the Vercel AI Gateway; with the explicit provider use `anthropic('claude-...')`. **Model split:** `claude-sonnet-4-6` is the **chat/orchestration brain** (the LLM driving this `/api/chat` CLARIFY route). It is NOT the build engine — the Managed Agent that reads the `.docx` and builds the app runs `claude-opus-4-8` (configured inside the Managed Agent, see `claude-managed-agents`). Do not confuse the two.

## What changed from v4/v5 (do NOT use training-memory shapes)

| Old (v4/v5) | v6 current |
|---|---|
| `message.content` (string) | `message.parts: UIMessagePart[]` — render parts, there is no `.content` on UIMessage |
| `append()` / `handleSubmit` / managed `input` + `handleInputChange` | `sendMessage({ text })`; manage input with your own `useState` |
| `reload()` | `regenerate()` |
| `isLoading` boolean | `status: 'submitted' \| 'streaming' \| 'ready' \| 'error'` |
| `parameters` on tool | `inputSchema` on `tool()` |
| `maxSteps: n` | `stopWhen: stepCountIs(n)` |
| `experimental_toToolResultContent` / `toDataStreamResponse` | `toUIMessageStreamResponse()` |
| `addToolResult({ result })` | `addToolOutput({ tool, toolCallId, output })` (`addToolResult` still exists but is **@deprecated → use `addToolOutput`**) |
| `onToolCall` returns result | use `addToolOutput(...)` inside `onToolCall` (do **not** `await` it — avoids deadlock); or return value |
| `StreamData` / `createDataStream` | `createUIMessageStream` + `writer.write` (typed `data-*` parts) |
| `api` option on `useChat` | `api` lives on the **transport** (`new DefaultChatTransport({ api })`); `useChat` itself has no `api` field in `ChatInit` |

`tool-invocation` parts are now individually typed as `tool-${name}` (static tools) or `dynamic-tool` (runtime/unknown tools).

---

## 1. useChat return shape & UIMessage parts model

`useChat<UI_MESSAGE>(options)` returns:

```ts
{
  id: string;
  messages: UI_MESSAGE[];
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  error: Error | undefined;
  sendMessage: (message?, options?: ChatRequestOptions) => Promise<void>;
  regenerate: (options?: { messageId?: string } & ChatRequestOptions) => Promise<void>;
  stop: () => void;
  clearError: () => void;
  resumeStream: () => void;
  setMessages: (m: UI_MESSAGE[] | ((m: UI_MESSAGE[]) => UI_MESSAGE[])) => void;   // <-- client-side message injection (BUILD result, see §7)
  addToolOutput: (o) => void;            // preferred
  addToolResult: (o) => void;            // @deprecated alias of addToolOutput
  addToolApprovalResponse: (o) => void;
}
```

`UIMessage<METADATA, DATA_PARTS, TOOLS>`:

```ts
interface UIMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  metadata?: METADATA;
  parts: Array<UIMessagePart>;   // <-- render this; no .content
}
```

`UIMessagePart` union (the `part.type` values you switch on):
- `'text'` → `{ type:'text'; text:string; state?:'streaming'|'done' }`
- `'reasoning'` → `{ type:'reasoning'; text:string; state?: ... }`
- `` `tool-${NAME}` `` (static, typed) — see ToolUIPart states below
- `'dynamic-tool'` → `{ type:'dynamic-tool'; toolName:string; toolCallId; ...state }`
- `'source-url'` / `'source-document'`
- `'file'` → `{ type:'file'; url:string; mediaType:string }`
- `` `data-${NAME}` `` → `{ type:`data-${name}`; id?:string; data:DATA }` (your custom parts)
- `'step-start'`

ToolUIPart / DynamicToolUIPart `state` machine and fields:
- `'input-streaming'` → `input?` (partial)
- `'input-available'` → `input` (complete; tool is executing / awaiting client)
- `'approval-requested'` / `'approval-responded'` → `input`, `approval`
- `'output-available'` → `input`, `output` (`preliminary?` for streamed/partial outputs)
- `'output-error'` → `input`, `errorText`
- Always present: `toolCallId`, optional `providerExecuted`, `callProviderMetadata`.

### Minimal client (input is yours, render parts)

```tsx
'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export default function Chat() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const [input, setInput] = useState('');

  return (
    <>
      {messages.map(m => (
        <div key={m.id}>
          <b>{m.role === 'user' ? 'You' : 'AI'}: </b>
          {m.parts.map((part, i) => {
            if (part.type === 'text') return <span key={i}>{part.text}</span>;
            if (part.type === 'reasoning') return <pre key={i}>{part.text}</pre>;
            return null;
          })}
        </div>
      ))}
      <form onSubmit={e => { e.preventDefault(); if (input.trim()) { sendMessage({ text: input }); setInput(''); } }}>
        <input value={input} onChange={e => setInput(e.target.value)} disabled={status !== 'ready'} />
        <button type="submit" disabled={status !== 'ready'}>Send</button>
      </form>
    </>
  );
}
```

`sendMessage` inputs: `{ text }`, `{ files }` (a `FileList`), `{ text, files }`, or `{ parts: [...] }`, plus optional 2nd arg `{ metadata, headers, body }`. The `body` field is how you attach the **`confirmedSchema`** on the Confirm action (see §2a).

---

## 2. Server route: streamText + toUIMessageStreamResponse (App Router)

```ts
// app/api/chat/route.ts  — CLARIFY phase only (Sonnet)
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { tools } from '@/ai/tools';

export const maxDuration = 30; // Vercel function timeout (seconds)

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'), // chat/orchestration brain (NOT the opus build engine)
    system: 'You are a helpful assistant.',
    messages: await convertToModelMessages(messages), // <-- ASYNC in v6, must await
    tools,
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
}
```

**GOTCHA (verified):** `convertToModelMessages` returns `Promise<ModelMessage[]>` in v6 — it is async. Always `await` it. Forgetting the `await` typechecks as passing a Promise where `ModelMessage[]` is expected and fails at runtime.

`toUIMessageStreamResponse()` accepts options like `{ originalMessages, onFinish, messageMetadata, sendReasoning, sendSources, onError }` for persistence and metadata streaming. Use `originalMessages` + `onFinish` to persist the full message list to MongoDB after the stream completes.

### 2a. The `data-schema` boundary object (Sonnet → Opus handoff)

The intermediate field schema (written by Opus to `/mnt/session/outputs/schema.json` and zod-validated by `/api/parse`, see `claude-managed-agents`) seeds the chat as a **persistent custom data part** with a **stable `id`**. This part is the single boundary object between the Sonnet CLARIFY brain and the Opus build engine — it renders an editable `SchemaCard`, the user edits/confirms, and the confirmed value is what `/api/build` injects verbatim into the Opus kickoff turn.

Type the part on your message:

```ts
export type Schema = {
  archetype: string;
  fields: Array<{ id: string; label: string; type: 'text' | 'choice' | 'scale'; options?: string[] }>;
  // ...whatever your zod-validated schema shape is
};

export type DocToAppMessage = UIMessage<
  never,                                   // metadata
  {
    'schema': Schema;                      // PERSISTENT editable schema card (id="schema")
    'agent-status': { phase: 'parsing' | 'building' | 'reviewing'; detail?: string };
    'artifact': { blobUrl: string; bytes: number; slug: string };
  }
>;
```

**Emit it once, reuse `id:'schema'` to overwrite on every edit** (omit `transient` so it persists in `message.parts`):

```ts
// after /api/parse returns the validated schema, the route (or a server writer) emits:
writer.write({ type: 'data-schema', id: 'schema', data: validatedSchema });
// ...later, any model-side edit re-writes the SAME id, replacing the prior card in place:
writer.write({ type: 'data-schema', id: 'schema', data: editedSchema });
```

> Reusing one stable `id` is what makes the card update-in-place instead of stacking duplicate cards. Treat `id:'schema'` as the canonical singleton.

**Render the editable card** from `message.parts`, hold edits in local state, and on **Confirm** call `sendMessage` with the confirmed schema in the `body`:

```tsx
'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export default function Clarify({ sessionId }: { sessionId: string }) {
  const { messages, sendMessage, status } = useChat<DocToAppMessage>({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  return (
    <>
      {messages.map(m => m.parts.map((part, i) => {
        if (part.type === 'text') return <span key={i}>{part.text}</span>;

        if (part.type === 'data-schema') {
          // editable card — local draft state, seeded from the persistent part
          return (
            <SchemaCard
              key={part.id ?? i}                      // keyed by the stable 'schema' id
              schema={part.data}
              onConfirm={(confirmedSchema) =>
                // POSTs to /api/build via the transport body (NOT a chat turn the model sees as text)
                sendMessage(
                  { text: 'Confirmed — build it.' },
                  {
                    body: { confirmedSchema, sessionId }, // boundary object handed to Opus verbatim
                  },
                )
              }
            />
          );
        }
        return null;
      }))}
    </>
  );
}
```

On the server, read `confirmedSchema` off the request body and (per the locked architecture) kick off the build via `/api/build`, which sends ONE clean Opus steering turn embedding the confirmed schema. The CLARIFY answers collected via `askQuestion` (§5) stay inside Sonnet and refine *this* schema card; they are **not** steered into Opus one at a time.

> **Where `confirmedSchema` rides:** `sendMessage(message, { body })` merges `body` into the transport POST payload. With `DefaultChatTransport` you can also set a request-time `body` on the transport itself or via `prepareSendMessagesRequest` (§6c). Verify the exact merge precedence against your installed `@ai-sdk/react` if you set `body` in both places (added to caveats).

---

## 3. Defining tools, the tool loop, stopWhen

```ts
// ai/tools.ts
import { tool } from 'ai';
import { z } from 'zod';

export const tools = {
  // Auto-executed server tool (has execute) — result auto-streams back.
  parseDocx: tool({
    description: 'Parse an uploaded .docx into an intermediate field schema',
    inputSchema: z.object({ blobUrl: z.string().url() }),
    execute: async ({ blobUrl }) => {
      const schema = await parse(blobUrl);
      return { fields: schema.fields, scales: schema.scales };
    },
  }),

  // Human-in-the-loop tool: NO execute -> see section 5.
  askQuestion: tool({
    description: 'Ask the professional to clarify an ambiguous field via Generative UI',
    inputSchema: z.object({
      question: z.string(),
      kind: z.enum(['choice', 'text', 'scale']),
      options: z.array(z.string()).optional(),
    }),
    // intentionally no execute
  }),
};
```

- `stopWhen: stepCountIs(n)` lets the model keep going for multiple tool round-trips in one request (default is a single step). Combine conditions in an array, e.g. `stopWhen: [stepCountIs(10), hasToolCall('finish')]`.
- A tool **with** `execute` runs server-side; its output streams to the client and the loop continues automatically.
- A tool **without** `execute` produces an `input-available` tool part and the stream finishes that step waiting for a client-supplied output (human-in-the-loop).
- Type inference: `type MyTools = InferUITools<typeof tools>` to feed `UIMessage<_, _, MyTools>` so `part.input`/`part.output` are typed per tool.

---

## 4. Generative UI — rendering tool parts as React components

Switch on `part.type === 'tool-<NAME>'`, then on `part.state`. `part.input` / `part.output` are typed when you parametrize `UIMessage` with `InferUITools`.

```tsx
{m.parts.map((part, i) => {
  switch (part.type) {
    case 'text':
      return <span key={i}>{part.text}</span>;

    case 'tool-parseDocx':
      switch (part.state) {
        case 'input-streaming': return <Spinner key={i} label="Reading template..." />;
        case 'input-available': return <Spinner key={i} label={`Parsing ${part.input.blobUrl}`} />;
        case 'output-available': return <SchemaPreview key={i} fields={part.output.fields} />;
        case 'output-error':     return <Err key={i}>{part.errorText}</Err>;
      }
      return null;

    case 'dynamic-tool': // tools whose name isn't statically known
      return <pre key={i}>{part.toolName}: {JSON.stringify(part.input)}</pre>;

    default:
      return null;
  }
})}
```

Helpers for safer narrowing: `isToolUIPart(part)`, `getToolName(part)`, `isToolOrDynamicToolUIPart(part)`, `getToolOrDynamicToolName(part)`.

---

## 5. Human-in-the-loop: the `askQuestion` tool

Pattern: define `askQuestion` with **no `execute`** (section 3). When the model calls it, a `tool-askQuestion` part reaches `input-available`. Render a Generative-UI form; on submit call `addToolOutput`, and let `sendAutomaticallyWhen` resubmit so the model continues. These answers refine the Sonnet-owned `data-schema` card (§2a) — they are NOT individually steered into Opus.

```tsx
'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';

export default function Chat() {
  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    // Auto-resubmit once every tool call in the last assistant msg has an output.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  return (
    <>
      {messages.map(m => m.parts.map((part, i) => {
        if (part.type === 'text') return <span key={i}>{part.text}</span>;

        if (part.type === 'tool-askQuestion') {
          switch (part.state) {
            case 'input-streaming':
              return <div key={i}>...</div>;
            case 'input-available':
              return (
                <QuestionCard key={i} q={part.input.question} options={part.input.options}
                  onAnswer={(answer) =>
                    // Do NOT await inside onToolCall; here in an event handler it's fine.
                    addToolOutput({
                      tool: 'askQuestion',     // must match the tool key
                      toolCallId: part.toolCallId,
                      output: answer,          // becomes the tool result the model sees
                    })
                  }
                />
              );
            case 'output-available':
              return <div key={i}>Answered: {String(part.output)}</div>;
            case 'output-error':
              return <div key={i}>Error: {part.errorText}</div>;
          }
        }
        return null;
      }))}
    </>
  );
}
```

`addToolOutput` signature (verified): `{ tool, toolCallId, output }` for success, or `{ tool, toolCallId, state: 'output-error', errorText }` for failure; optional `options?: ChatRequestOptions`. `tool` is the typed tool key; `output` must match that tool's inferred output type.

For tools that should run **on the client automatically** (e.g. read browser geolocation), use the `onToolCall` callback instead and call `addToolOutput` synchronously (no `await` — awaiting deadlocks the stream):

```tsx
useChat({
  onToolCall: ({ toolCall }) => {
    if (toolCall.dynamic) return;
    if (toolCall.toolName === 'getLocation') {
      addToolOutput({ tool: 'getLocation', toolCallId: toolCall.toolCallId, output: navigator.language });
    }
  },
});
```

For an explicit approval gate (different from askQuestion), the SDK has a first-class flow: tool parts reach `state: 'approval-requested'` (with `part.approval.id`), and you respond via `addToolApprovalResponse({ id, approved, reason? })`, then resubmit with `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses`.

> **CLARIFY-only scope:** `askQuestion` lives entirely on the Sonnet `/api/chat` loop. Its answers refine Sonnet's view and the `data-schema` card; Opus receives only ONE clean build steering turn with the FINAL confirmed schema (via `/api/build`). The agent-side custom-tool / `requires_action` confirmation path is a different mechanism and is NOT used for clarify — see `claude-managed-agents`.

---

## 6. Custom transport + bridging the Managed Agent event stream (CLARIFY/parse re-tail only)

The Managed Agent is the parse/build engine. For the **CLARIFY/parse** phase you can bridge its event stream into the AI SDK UI message stream as below. **The BUILD phase is the exception — it is NOT a useChat-owned stream on Vercel; see §7.** Two layers:

> **Authoritative source for the agent side:** the exact Managed-Agent event names, the agent-event→text mapping, and the file in/out + steering-turn flow live in the **`claude-managed-agents`** skill — defer to it, do NOT re-derive them here. This section only covers the AI-SDK-v6 bridge (`createUIMessageStream` → `writer` → `UIMessageChunk`).

### 6a. Server side — `createUIMessageStream` + `writer` (recommended bridge point)

**Do NOT use `new EventSourceParserStream()` here** — it is not a Web API and is not exported by `ai`, so it will not compile. The Managed-Agent stream is **not** raw SSE you parse yourself: `client.beta.sessions.events.stream(sessionId)` (from `@anthropic-ai/sdk`) returns an **async-iterable `Stream`**, so consume it directly with `for await (const ev of stream)`. Open the agent stream **before** you send the `user.message`. Translate each agent event into an AI SDK `UIMessageChunk` on your server route and return a standard UI message stream response; the client then uses a normal `DefaultChatTransport`.

```ts
// app/api/chat/route.ts
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from 'ai';
import { client } from '@/lib/anthropic'; // configured @anthropic-ai/sdk client

// Custom data parts you stream to the UI (typed) — same DocToAppMessage as §2a.
// 'schema' (persistent, id="schema") | 'agent-status' (transient) | 'artifact' (persistent)

export async function POST(req: Request) {
  const { messages, sessionId }: { messages: DocToAppMessage[]; sessionId: string } = await req.json();

  const stream = createUIMessageStream<DocToAppMessage>({
    originalMessages: messages,          // enables message id reconciliation + onFinish persistence
    onFinish: ({ messages }) => { /* persist to MongoDB */ },
    onError: (e) => (e instanceof Error ? e.message : 'stream error'),
    execute: async ({ writer }) => {
      writer.write({ type: 'start' });   // begin assistant message

      // ---- consume the Managed-Agent event Stream (async-iterable, NOT raw SSE) ----
      // Open the stream BEFORE sending the user message turn. Event names per claude-managed-agents.
      const agentStream = await client.beta.sessions.events.stream(sessionId);
      await client.beta.sessions.events.send(sessionId, {
        events: [{ type: 'user.message', content: [{ type: 'text', text: latestUserText(messages) }] }],
      });

      const textId = crypto.randomUUID();
      let textOpen = false;

      for await (const ev of agentStream) {
        switch (ev.type) {
          case 'agent.message':           // assistant text — iterate content blocks
            for (const block of ev.content ?? []) {
              if (block.type === 'text') {
                if (!textOpen) { writer.write({ type: 'text-start', id: textId }); textOpen = true; }
                writer.write({ type: 'text-delta', id: textId, delta: block.text });
              }
            }
            break;
          case 'agent.tool_use':          // mirror agent's file tool calls as a transient status part
            writer.write({ type: 'data-agent-status', data: { phase: 'building', detail: ev.name }, transient: true });
            break;
          case 'agent.tool_result':
            break;                          // cloud feeds results back automatically; surface if you want
          case 'session.status_idle':
            if (ev.stop_reason?.type === 'end_turn') {
              if (textOpen) { writer.write({ type: 'text-end', id: textId }); textOpen = false; }
              writer.write({ type: 'finish' });
              return;                       // TURN DONE
            }
            break;                          // stop_reason 'requires_action' -> tool confirmation (see claude-managed-agents)
          case 'session.error':
            writer.write({ type: 'error', errorText: ev.error?.message ?? 'agent error' });
            return;
        }
      }

      if (textOpen) writer.write({ type: 'text-end', id: textId });
      writer.write({ type: 'finish' });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
```

> **DEV synchronous re-tail vs DEPLOY fire-and-forget:** the bridge above (holding the connection open and consuming the whole turn) is the **DEV** pattern — `next dev` has no function timeout. On **Vercel** the BUILD turn outlives the function: you must use the fire-and-forget + poll + `setMessages()` pattern in §7, NOT this synchronous bridge, for the build. The parse turn (short) can still use a held connection.

The artifact link comes from the file OUTPUT flow (`client.beta.files.list` → `download`, see `claude-managed-agents`); once you have its URL, emit a **persistent** data part so it stays in `message.parts`:

```ts
writer.write({ type: 'data-artifact', id: 'final', data: { blobUrl, bytes, slug } });
```

> **If you ever do parse a genuinely raw `text/event-stream`** (not the Managed-Agent path): there is no `EventSourceParserStream` in `ai`. Either (a) use `parseJsonEventStream` re-exported from `ai` — **verify the export name against your installed `ai` version** (`grep parseJsonEventStream node_modules/ai/dist/*.d.ts`) — or (b) hand-parse: buffer the `TextDecoderStream` output, split frames on `\n\n`, and read the `data:`-prefixed lines.

**Full `UIMessageChunk` `type` values you may `writer.write` (verified union):**
`start` (`{messageId?, messageMetadata?}`), `finish` (`{finishReason?, messageMetadata?}`), `abort`, `message-metadata`, `start-step`, `finish-step`, `text-start`/`text-delta` (`{id, delta}`)/`text-end` (all keyed by a stable `id`), `reasoning-start`/`reasoning-delta`/`reasoning-end`, `tool-input-start` (`{toolCallId, toolName}`), `tool-input-delta` (`{toolCallId, inputTextDelta}`), `tool-input-available` (`{toolCallId, toolName, input}`), `tool-input-error`, `tool-output-available` (`{toolCallId, output, preliminary?}`), `tool-output-error`, `tool-approval-request`, `tool-output-denied`, `source-url`, `source-document`, `file` (`{url, mediaType}`), `error` (`{errorText}`), and your `data-<name>` (`{ type:'data-name', id?, data, transient? }`).

- **`transient: true`** data parts are delivered to the client `onData` callback only and are **not** added to `message.parts` (use for ephemeral progress/status).
- Reusing the same `id` on a `data-*` part **reconciles/overwrites** the prior one (good for the single `data-schema` card, a single updating status row, or a progress bar).
- To merge a *normal* `streamText` result into the same stream (e.g. a chat preamble before the agent runs), call `writer.merge(result.toUIMessageStream())`.

### 6b. Client side — consuming custom data parts

```tsx
const { messages } = useChat<DocToAppMessage>({
  transport: new DefaultChatTransport({ api: '/api/chat' }),
  onData: (dataPart) => {                 // ALL data parts, incl. transient
    if (dataPart.type === 'data-agent-status') setPhase(dataPart.data.phase);
  },
});

// Persistent data parts also live in message.parts:
m.parts.filter(p => p.type === 'data-schema')   // editable card (id="schema")
       .map((p, i) => <SchemaCard key={i} schema={p.data} onConfirm={...} />);
m.parts.filter(p => p.type === 'data-artifact')
       .map((p, i) => <a key={i} href={`/d/${p.data.slug}`}>Open mini-app</a>);
```

### 6c. Fully custom `ChatTransport` (only if you must bridge on the client)

Implement the interface and return a `ReadableStream<UIMessageChunk>`. Prefer 6a — the Managed Agent SDK client and file APIs are server-only, so the agent bridge belongs on the server. Use a custom client transport only to reshape requests/responses against your own `/api/chat`, not to reach the agent directly from the browser.

```ts
import type { ChatTransport, UIMessage, UIMessageChunk, ChatRequestOptions } from 'ai';

class ManagedAgentTransport implements ChatTransport<UIMessage> {
  async sendMessages(options: {
    trigger: 'submit-message' | 'regenerate-message';
    chatId: string;
    messageId: string | undefined;
    messages: UIMessage[];
    abortSignal: AbortSignal | undefined;
  } & ChatRequestOptions): Promise<ReadableStream<UIMessageChunk>> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: options.messages, trigger: options.trigger }),
      signal: options.abortSignal,
    });
    // /api/chat returns the AI-SDK UI message stream (SSE of UIMessageChunks,
    // header x-vercel-ai-ui-message-stream: v1). Hand res.body straight back as
    // ReadableStream<UIMessageChunk>; DefaultChatTransport normally does this for you.
    // (Do NOT use EventSourceParserStream — it isn't exported by `ai`.)
    return res.body as unknown as ReadableStream<UIMessageChunk>;
  }
  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null; // no resume support
  }
}
// useChat({ transport: new ManagedAgentTransport() })
```

Notes:
- `DefaultChatTransport` already does the right thing when the server returns `toUIMessageStreamResponse()` / `createUIMessageStreamResponse()` — you rarely need a custom client transport. It posts `{ messages, trigger, id, messageId }` plus any request-time `body` (customizable via `prepareSendMessagesRequest`). This is the mechanism the `confirmedSchema` body field (§2a) rides on.
- The UI message stream wire format is SSE with header `x-vercel-ai-ui-message-stream: v1` (`UI_MESSAGE_STREAM_HEADERS`); each `data:` line is a JSON `UIMessageChunk`. To turn raw JSON chunks into SSE on a hand-rolled response use `new JsonToSseTransformStream()`. To parse an incoming UI message stream back into a typed message client-side, `readUIMessageStream({ stream })` yields successive `UIMessage` snapshots.
- `DefaultChatTransport` options: `{ api?, credentials?, headers?, body?, fetch?, prepareSendMessagesRequest?, prepareReconnectToStreamRequest? }`. `headers`/`body`/`credentials` may be values or functions (resolved per request) — use `body`/`headers` to attach `documentId`, `sessionId`, `confirmedSchema`, auth, etc.

---

## 7. The BUILD phase is NOT a useChat-owned stream (Vercel) — poll + setMessages()

**This is the most important architectural constraint in this skill.** On Vercel, the BUILD does not stream into a `useChat` assistant message:

- The Managed Agent build runs **asynchronously on Anthropic** and takes minutes. `/api/build` fires the kickoff turn and **returns immediately** (Hobby/60s-safe). Completion is reported by a **webhook** to `/api/webhooks/anthropic`, which publishes the artifact (Blob + Mongo `status:"ready"`).
- **A webhook firing minutes later CANNOT resolve a `useChat` assistant message whose producing serverless function already exited.** The function that owned the original UI message stream is gone; there is nothing left to `writer.write` into. The completion is decoupled in time from any request the client had open.
- **`resumable-stream` does not save you here.** It is **reconnect-tolerant, NOT exit-tolerant**: it lets a *reconnecting client* re-attach to a stream whose producer is *still running*. Once the producing function has exited / the stream is finished, `createNewResumableStream` throws (the stream is already done) — there is no producer to resume, so a late webhook still cannot complete an old `useChat` message.

### Correct pattern: fire-and-forget → poll status → `setMessages()` inject

1. **Kickoff (separate route, returns fast):** the Confirm action's `sendMessage(..., { body:{ confirmedSchema, sessionId } })` (or a plain `fetch('/api/build', ...)`) hits `/api/build`, which sends ONE Opus steering turn with the confirmed schema, persists `{ sessionId, slug, status:'building' }`, and returns immediately. Do NOT hold the connection for the build.
2. **Poll:** the client polls `GET /api/build/[id]/status` → `{ status, artifactUrl }` until `status === 'ready'`.
3. **Inject client-side with `setMessages()`** — there is no server stream to carry the result, so you append the final persistent `data-artifact` part yourself:

```tsx
'use client';
import { useChat } from '@ai-sdk/react';

function useBuildResult(buildId: string) {
  const { setMessages } = useChat<DocToAppMessage>({ /* CLARIFY transport */ });

  // poll → on ready, inject the artifact part into the message list
  async function onReady(slug: string, blobUrl: string, bytes: number) {
    setMessages(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Your mini-app is ready.' },
          { type: 'data-artifact', id: 'final', data: { blobUrl, bytes, slug } }, // persistent
        ],
      },
    ]);
  }
  // ... poll GET /api/build/[buildId]/status; when status==='ready' call onReady(...)
}
```

`setMessages` accepts a value or an updater `(prev) => next`; it mutates the local `useChat` message list directly (no server round-trip). This is the supported way to surface an out-of-band result (build completion) inside the same chat UI.

> **`useChat` is scoped to the CLARIFY phase only.** It owns: the schema card, `askQuestion`, and (via `setMessages`) the final artifact injection. It does NOT own the BUILD stream. Optional **DEV** live-tail or an optional **Pro/Fluid** re-tailable `GET /api/build/[sessionId]/stream` (open stream → seed seen ids via `events.list` → dedupe by id) can show live progress, but the source of truth for completion on Vercel is the webhook + poll, not a held `useChat` stream.

---

## 8. useChat options (`ChatInit`) reference

```ts
useChat({
  id?: string;
  messages?: UIMessage[];            // initial history (e.g. loaded from MongoDB)
  transport?: ChatTransport;         // default DefaultChatTransport -> /api/chat
  generateId?: () => string;
  messageMetadataSchema?, dataPartSchemas?,
  onError?: (e: Error) => void,
  onToolCall?: ({ toolCall }) => void | result,   // client-side tool autorun
  onFinish?: ({ message, messages, isAbort, isDisconnect, isError, finishReason }) => void,
  onData?: (dataPart) => void,        // custom data-* parts (incl. transient)
  sendAutomaticallyWhen?: ({ messages }) => boolean,  // e.g. lastAssistantMessageIsCompleteWithToolCalls
  experimental_throttle?: number,     // ms; throttle re-renders during fast streams
  resume?: boolean,                   // resume an interrupted stream on mount (reconnect-tolerant, NOT exit-tolerant — see §7)
})
```

There is **no `api` field on `useChat`** in v6 — set it on the transport.

## Gotchas checklist

- `useChat` is **CLARIFY-only**: schema card + `askQuestion` + final artifact injection via `setMessages`. The BUILD is fire-and-forget + poll + `setMessages` (§7), never a held `useChat` stream on Vercel.
- A late webhook **cannot** resolve a `useChat` message whose producing function already exited; `resumable-stream` is reconnect-tolerant, NOT exit-tolerant (`createNewResumableStream` throws once the stream is done).
- The `data-schema` part is the Sonnet→Opus boundary object: persistent, `id:'schema'`, reuse the id to overwrite on edits; render an editable `SchemaCard`; on Confirm pass `{ confirmedSchema, sessionId }` via `sendMessage(msg, { body })`.
- `await convertToModelMessages(messages)` — it is async in v6.
- Render `message.parts`, never `message.content`; gate the input on `status === 'ready'`, not `isLoading`.
- Use `addToolOutput` (not the deprecated `addToolResult`); never `await` it inside `onToolCall`.
- For multi-step tool loops set `stopWhen: stepCountIs(n)` on the server AND `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls` on the client, or the conversation stalls after a client tool result.
- Human-in-the-loop = a tool with **no `execute`**; the loop pauses at `input-available` until `addToolOutput`. CLARIFY answers refine Sonnet's schema card; they are NOT steered into Opus one-by-one.
- Custom data: `transient:true` → `onData` only; omit `transient` → persisted in `message.parts`; reuse `id` to update-in-place.
- Chat-brain model is `anthropic('claude-sonnet-4-6')` with the explicit provider; the `'anthropic/claude-sonnet-4-6'` slash-form requires the AI Gateway. The Managed Agent build engine (`claude-opus-4-8`) is configured separately — see `claude-managed-agents`.
- Bridging the Managed Agent (parse/CLARIFY only): consume `client.beta.sessions.events.stream(sessionId)` with `for await (const ev of stream)` — it is an async-iterable `Stream`, NOT raw SSE. There is no `EventSourceParserStream` in `ai`. Defer to `claude-managed-agents` for the exact event names and stop conditions.
