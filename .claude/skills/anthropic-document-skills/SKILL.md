---
name: anthropic-document-skills
description: "Reference card for Anthropic's prebuilt document Agent Skills (docx, pdf, pptx, xlsx) and how to drive them from the Claude API — both the Messages API + code-execution surface and the Claude Managed Agents surface. Use when wiring the PARSE+BUILD engine: attaching the docx/pdf skill to a Claude container, uploading a Word/PDF file for the agent to parse, choosing skill_id/version, reconciling the code-execution vs managed-agents beta headers, knowing what the docx skill can actually do and its no-network runtime constraints, and deciding between the hosted skill_id and the open-source skill source. Trigger when building DocToApp's docx parsing/HTML-build pipeline or any code that sets container.skills / agent skills."
---

# Anthropic Document Skills (docx / pdf / pptx / xlsx)

Reference card for Anthropic's prebuilt document Agent Skills and how DocToApp drives them. Verified live May 2026.

> **HEADER RULE (read first).** DocToApp uses **Claude Managed Agents** exclusively. The ONE beta header for everything here is **`managed-agents-2026-04-01`** (the `@anthropic-ai/sdk` adds it automatically on every `client.beta.*` call; raw curl must set it). **Do NOT mix the Messages-API `code-execution-2025-08-25` / `skills-2025-10-02` beta headers with `managed-agents-2026-04-01`.** Those headers belong to a different surface (see the reference-only aside at the bottom) and combining them is a configuration error. On Managed Agents, skills/tools are configured **structurally on the agent**, not via beta headers.

## TL;DR for DocToApp

Our PARSE+BUILD engine is "Claude (the BUILD ENGINE, model `claude-opus-4-8`) + the agent toolset + the official `docx`/`pdf` skills" running in an Anthropic **Managed Agents** cloud sandbox. The agent parses the uploaded clinical Word/PDF template into an intermediate JSON schema, then hand-builds a self-contained single-file `index.html`, iterating write → review → edit.

Prebuilt skill_ids (exact): **`docx`, `pdf`, `pptx`, `xlsx`** — all `type: "anthropic"`. There is no "html" skill; the agent builds the single-file HTML with plain bash/write/edit file tools. The **docx skill is only needed to PARSE the uploaded Word file**; the HTML build is hand-rolled by the agent.

> **Authority:** the session / file / event lifecycle (event→text mapping, the `/api/chat` server bridge, the steering-turn answer path, the networking decision) is owned by the **`claude-managed-agents`** skill. Defer to it as the single source of truth. This card adds only what is specific to the **document skills** themselves (capabilities, scripts, runtime libs, hosted-vs-source, licensing) and shows where they bolt onto the Managed Agents objects.

## How the document skills attach (Managed Agents)

Four objects (full detail in `claude-managed-agents`): **Agent** (model + system + tools + skills + mcp, versioned), **Environment** (cloud|self_hosted, reusable, not versioned), **Session** (one running agent instance + its own sandbox), **Events** (`user.*` in, `agent.*`/`session.*`/`span.*` out).

Skills attach on the **AGENT** via the top-level `skills` array — `[{ type: "anthropic", skill_id: "docx" | "pdf" }]`. Tools attach via `tools: [{ type: "agent_toolset_20260401" }]` (= bash / read / write / edit / glob / grep / web_fetch / web_search).

```jsonc
// POST /v1/agents   — skills + tools live HERE, on the agent (NOT on the session, NOT via container.skills)
{
  "name": "doctoapp-builder",
  "model": "claude-opus-4-8",                         // BUILD ENGINE model (per claude-managed-agents canon)
  "system": "You parse an uploaded clinical Word/PDF template into an intermediate JSON schema, then build a self-contained single-file index.html (inline CSS/JS, localStorage persistence) that a patient can fill. Write the final artifact to /mnt/session/outputs/. Iterate: write -> review -> edit.",
  "tools": [{ "type": "agent_toolset_20260401" }],     // bash + file ops + web_search/web_fetch
  "skills": [
    { "type": "anthropic", "skill_id": "docx" },
    { "type": "anthropic", "skill_id": "pdf" }
  ]
}
// limits: tools<=128, skills<=20, mcp_servers<=20
```
```jsonc
// POST /v1/environments  — reusable; NOT versioned
{ "name": "doctoapp-cloud", "config": { "type": "cloud", "networking": { "type": "limited" } } }
```
```jsonc
// POST /v1/sessions  — references agent + environment; model/system/tools/skills are NOT repeated here.
// Input files mount via resources[] (see below).
{
  "agent": "agent_abc123",
  "environment_id": "env_abc123",
  "title": "Parse + build for user X",
  "resources": [
    { "type": "file", "file_id": "file_abc123", "mount_path": "/mnt/session/uploads/template.docx" }
  ]
}
```

### File flow (DEFINITIVE — Managed Agents)

This is exactly the flow `claude-managed-agents` specifies; restated here because it is the document-skill input/output path.

**INPUT.** Upload the template, then **mount it on the session via the `resources` array**. The agent reads it at the `mount_path`:

```typescript
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { createReadStream } from "node:fs";
const client = new Anthropic(); // ANTHROPIC_API_KEY from env; beta header added automatically

// 1) Upload the clinical template (.docx/.pdf)
const uploaded = await client.beta.files.upload({
  file: await toFile(createReadStream("template.docx"), "template.docx"),
});

// 2) Mount it on the session via resources[]. mount_path is optional;
//    default is /mnt/session/uploads/<file_id>. The agent reads it there.
const session = await client.beta.sessions.create({
  agent: agentId,
  environment_id: envId,
  title: "Parse + build for user X",
  resources: [
    { type: "file", file_id: uploaded.id, mount_path: "/mnt/session/uploads/template.docx" },
  ],
});
```
- Do **NOT** put a `document`/`file_id` block in the `user.message`. Mounting happens via `resources`.
- Uploaded input files are **not** re-downloadable.

**OUTPUT.** The agent **MUST write the final artifact to `/mnt/session/outputs/`** — only that directory persists. Retrieve with `files.list` (scoped to the session, with the explicit beta) then `files.download`:

```typescript
const list = await client.beta.files.list({
  scope_id: session.id,
  betas: ["managed-agents-2026-04-01"],
});
const out = list.data.find((f) => f.filename === "index.html"); // only agent-created files have downloadable:true
const content = await client.beta.files.download(out.id);

// Read bytes. PRIMARY: Response-like with .arrayBuffer().
// DEFENSIVE fallback (verify against the installed @anthropic-ai/sdk .d.ts): if it is a Node Readable, buffer the chunks.
let buf: Buffer;
if (typeof (content as any).arrayBuffer === "function") {
  buf = Buffer.from(await (content as any).arrayBuffer());
} else {
  const chunks: Buffer[] = [];
  for await (const chunk of content as any) chunks.push(Buffer.from(chunk));
  buf = Buffer.concat(chunks);
}
// e.g. push buf to Vercel Blob
```

For DocToApp's HTML artifact, capturing the content as a **string** (have the agent `cat` the final file to stdout, surfaced through the event stream) is also viable and avoids a round-trip — but the file MUST still live under `/mnt/session/outputs/` to survive the session.

### Driving the build + getting text back
- Send work with a `user.message` event; consume the response with the async-iterable Stream (`for await (const ev of stream)`). The verified `agent.message` → text mapping, the `/api/chat` `createUIMessageStream` bridge, and the **steering-turn** answer path (`askQuestion` human-in-the-loop → `addToolOutput` → `client.beta.sessions.events.send(sessionId,{events:[{type:"user.message",...}]})`, optionally preceded by `{type:"user.interrupt"}`) all live in **`claude-managed-agents`** — do not re-derive them here.

> Managed Agents is stateful → NOT eligible for ZDR or HIPAA BAA. Delete sessions and uploaded files via the API when done. (Relevant since Terapify handles clinical data.)

## What the docx skill actually does (and its scripts)

Frontmatter triggers on "Word doc", ".docx", professional-document requests. Capabilities:
- **Read / analyze** (our use case): extract text via `pandoc`, or unpack the raw OOXML to inspect structure, tables, and form fields directly. Workflow: `python scripts/office/unpack.py document.docx unpacked/` → read/inspect `unpacked/word/document.xml`.
- **Create new**: JavaScript `docx` (docx-js) library — `npm install -g docx`.
- **Edit existing**: unpack → edit XML in `unpacked/word/` → `python scripts/office/pack.py unpacked/ output.docx --original document.docx`. Validate with `scripts/office/validate.py`; comments via `comment.py`; PDF via LibreOffice `soffice.py`.
- Handles tables, headers/footers, TOC, multi-column, tracked changes, comments, images.

For DocToApp the relevant moves are **unpack + read XML** and **pandoc text extraction** — that gives the agent the full field/section/table structure to infer the intermediate JSON schema (fields, scales, recurrence). Form-controls (content controls / legacy form fields) live in the OOXML as `w:sdt` / `w:fldChar` `FORMTEXT|FORMCHECKBOX|FORMDROPDOWN` runs — instruct the agent to surface these as the fillable fields.

The **pdf skill** (skill_id `pdf`) parses text/tables (pdfplumber), form fields and form-filling (see its FORMS.md), merge/split/rotate (pypdf/qpdf), OCR (pytesseract + pdf2image), create (reportlab). Useful if a professional uploads a PDF template instead of .docx.

## Runtime constraints (Managed Agents sandbox)

- **Networking is governed by the Environment, not blanket-blocked.** `config.networking.type` is **`"unrestricted"`** (DEFAULT — full outbound egress minus a safety blocklist) or **`"limited"`** (restricts to `allowed_hosts[]`; toggles `allow_mcp_servers` / `allow_package_managers`, both default `false`). This controls only the SANDBOX's outbound access and **does NOT impact the `web_search` / `web_fetch` tools' allowed domains** — those are separate agent tools. The `docx`/`pdf` skills do their parsing **fully offline** (pandoc/python-docx/pdfplumber on the mounted file) — they need no egress, so `"limited"` (least privilege, with at most the HTTPS hosts you actually require) is safe for the parse+build pipeline. Pick the value per `claude-managed-agents` canon; `"unrestricted"` is simplest for the hackathon, but verify the chosen value before shipping.
- **Package installs** depend on the environment: with `"limited"` networking, package managers are reachable only if `allow_package_managers: true` is set; otherwise rely on pre-installed packages. The skills' own scripts run against the pre-installed toolchain.
- **Resources**: 5 GiB RAM, 5 GiB disk, 1 CPU.

### Pre-installed Python libraries (relevant ones)
`python-docx`, `python-pptx`, `pypdf`, `pdfplumber`, `pypdfium2`, `pdf2image`, `pdfkit`, `tabula-py`, `reportlab[pycairo]`, `Img2pdf`, `openpyxl`, `xlsxwriter`, `xlrd`, `pyarrow`, `pillow`; `pandas`, `numpy`, `scipy`, `scikit-learn`, `statsmodels`, `matplotlib`, `seaborn`, `sympy`; CLI: `rg` (ripgrep), `fd`, `sqlite`, `unzip`, `7zip`, `bc`. (`pandoc` and LibreOffice/`soffice` are available to the office skills' scripts.)

## Hosted skill_id vs open-source skill source

- **Default: use the hosted `{type:"anthropic", skill_id:"docx"|"pdf"}`** on the agent. No upload, no maintenance, always current. This is correct for DocToApp's parse step.
- **Open-source source** (github.com/anthropics/skills, `skills/docx`, `skills/pdf`): these are the *reference implementations* of the same skills (SKILL.md + Python scripts like `unpack.py`/`pack.py`/`validate.py`, using python-docx/pandoc/docx-js). Note: docx/pdf/pptx/xlsx are **source-available but proprietary** (LICENSE.txt), NOT Apache-2.0 — do not vendor them into our open-source repo. Read them to understand behavior; don't redistribute.
- **Upload a custom skill** only if we need bespoke parsing logic the prebuilt skill lacks. SKILL.md required (`name` ≤64 chars lowercase/hyphen, `description` ≤1024 chars, no "anthropic"/"claude" in name). Custom skills are workspace-wide and referenced as `{type:"custom", skill_id:"skill_…", version:"…"}` on the agent.

## Gotchas
- **Header hygiene (repeat of the top rule):** never combine `code-execution-2025-08-25` / `skills-2025-10-02` with `managed-agents-2026-04-01`. Managed Agents uses ONLY `managed-agents-2026-04-01`, and only `files.list` with `scope_id` takes it explicitly via `betas:[...]`.
- Skills/tools go on the **agent** at creation — the session does NOT repeat them, and there is no `container.skills` in the Managed Agents path.
- Input files are mounted via the session `resources` array (`{type:"file",file_id,mount_path}`), read at `mount_path`. They are not re-downloadable.
- Output must be written to `/mnt/session/outputs/`; only that directory persists and only agent-created files are `downloadable:true`.
- Managed Agents is not ZDR/HIPAA-BAA eligible. Plan clinical-data handling and explicit deletion (sessions + uploaded files) accordingly.

---

## Reference only — Surface A (Messages API + code-execution + `container.skills`). NOT used by DocToApp.

> This entire section is background. DocToApp does **NOT** use it. It is the *other* way Anthropic exposes the same document skills (`POST /v1/messages` with `container.skills`). Its beta headers (`code-execution-2025-08-25`, `skills-2025-10-02`, `files-api-2025-04-14`) **must never** be mixed with `managed-agents-2026-04-01`. Use this surface only for a throwaway "parse this docx → JSON" probe outside the product, or to understand the skills in isolation.

On this surface, skills attach via `container: { skills: [{ type:"anthropic", skill_id:"docx", version:"latest" }] }`, the input file is a `{ type:"container_upload", file_id }` content block (NOT `document`), the tool is `{ type:"code_execution_20250825", name:"code_execution" }`, and generated files are extracted from `code_execution_tool_result` **and** `bash_code_execution_tool_result` blocks (a skill may run via python or bash). Containers expire 30 days after creation. None of this applies to the Managed Agents pipeline above — do not import these shapes (`container.skills`, `container_upload`, the code-execution tool, the result-block file-id extraction) into the product code.