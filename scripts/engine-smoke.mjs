// DocToApp — Phase 1 agentic engine smoke test (isolated, no Next/Mongo/Blob).
//
// Runs the REAL end-to-end against a real .docx:
//   create agent (Opus + docx/pdf skills + spec system prompt)
//   → create cloud env → upload .docx → create session (mount)
//   → PARSE turn → download /mnt/session/outputs/schema.json
//   → BUILD turn → download /mnt/session/outputs/index.html
//   → save both to scripts/out/ for inspection.
//
// Run:  node --env-file=.env.local scripts/engine-smoke.mjs
// (optionally:  node --env-file=.env.local scripts/engine-smoke.mjs "examples/<other>.docx")

import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, basename } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "scripts", "out");
const MOUNT_PATH = "/mnt/session/uploads/template.docx";
const BETAS = ["managed-agents-2026-04-01"];

function log(...a) {
  console.log(...a);
}

async function pickDocx() {
  if (process.argv[2]) return join(ROOT, process.argv[2]);
  const dir = join(ROOT, "examples");
  const files = await readdir(dir);
  // demo star = the CBT "Registro de situaciones" tracker
  const match =
    files.find((f) => /registro/i.test(f) && f.endsWith(".docx")) ||
    files.find((f) => f.endsWith(".docx"));
  if (!match) throw new Error("no .docx found in examples/");
  return join(dir, match);
}

/** Drive one turn to completion; returns the accumulated assistant text. */
async function runTurn(client, sessionId, text, label) {
  log(`\n──────── ${label} ────────`);
  const stream = await client.beta.sessions.events.stream(sessionId);
  await client.beta.sessions.events.send(sessionId, {
    events: [{ type: "user.message", content: [{ type: "text", text }] }],
  });

  let assistantText = "";
  for await (const ev of stream) {
    switch (ev.type) {
      case "agent.message":
        for (const b of ev.content ?? []) {
          if (b.type === "text") {
            assistantText += b.text;
            process.stdout.write(b.text);
          }
        }
        break;
      case "agent.tool_use":
        process.stdout.write(`\n  ⟨tool: ${ev.name}⟩ `);
        break;
      case "span.model_request_end":
        if (ev.model_usage) {
          const u = ev.model_usage;
          process.stdout.write(
            `\n  ⟨usage: in=${u.input_tokens ?? "?"} out=${u.output_tokens ?? "?"}⟩ `,
          );
        }
        break;
      case "session.error":
        console.error(`\n  ✖ session.error: ${ev.error?.message ?? "unknown"}`);
        break;
    }
    if (ev.type === "session.status_idle") {
      log(`\n  → idle (stop_reason: ${ev.stop_reason?.type ?? "?"})`);
      if (ev.stop_reason?.type === "end_turn") break;
      if (ev.stop_reason?.type === "requires_action") {
        throw new Error(
          "agent paused with requires_action — unexpected (we declare no custom tools)",
        );
      }
    }
    if (ev.type === "session.status_terminated" || ev.type === "session.error")
      break;
  }
  return assistantText;
}

async function downloadOutput(client, sessionId, filename) {
  const outputs = await client.beta.files.list({
    scope_id: sessionId,
    betas: BETAS,
  });
  const file = outputs.data.find((f) => f.filename === filename);
  if (!file)
    throw new Error(
      `agent did not write ${filename} to /mnt/session/outputs (found: ${outputs.data
        .map((f) => f.filename)
        .join(", ")})`,
    );
  const res = await client.beta.files.download(file.id);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "✖ ANTHROPIC_API_KEY not set. Run: node --env-file=.env.local scripts/engine-smoke.mjs",
    );
    process.exit(1);
  }
  await mkdir(OUT, { recursive: true });
  const client = new Anthropic();

  const docxPath = await pickDocx();
  log(`📄 template: ${basename(docxPath)}`);

  const system = await readFile(
    join(ROOT, "spec", "prompts", "build-engine.system.md"),
    "utf8",
  );

  log("→ creating agent (claude-opus-4-8 + docx/pdf skills)…");
  const agent = await client.beta.agents.create({
    name: "DocToApp Builder (smoke)",
    model: "claude-opus-4-8",
    system,
    tools: [{ type: "agent_toolset_20260401" }],
    skills: [
      { type: "anthropic", skill_id: "docx" },
      { type: "anthropic", skill_id: "pdf" },
    ],
  });
  log(`  agent ${agent.id} v${agent.version}`);

  log("→ creating cloud environment…");
  const environment = await client.beta.environments.create({
    name: "doctoapp-smoke",
    config: { type: "cloud", networking: { type: "unrestricted" } },
  });
  log(`  env ${environment.id}`);

  log("→ uploading .docx (Files API)…");
  const uploaded = await client.beta.files.upload({
    file: await toFile(await readFile(docxPath), "template.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
  });
  log(`  file ${uploaded.id}`);

  log("→ creating session (mounting the docx)…");
  const session = await client.beta.sessions.create({
    agent: agent.id,
    environment_id: environment.id,
    title: "engine smoke",
    resources: [
      { type: "file", file_id: uploaded.id, mount_path: MOUNT_PATH },
    ],
  });
  log(`  session ${session.id}`);

  // ── PARSE ──
  await runTurn(
    client,
    session.id,
    `El template del clínico está montado en ${MOUNT_PATH}. Este es un PARSE turn: léelo con la skill docx, infiere nuestro esquema intermedio (conforme al contrato) y ESCRÍBELO como JSON válido en /mnt/session/outputs/schema.json. NO construyas la app todavía.`,
    "PARSE turn",
  );
  const schemaBuf = await downloadOutput(client, session.id, "schema.json");
  await writeFile(join(OUT, "schema.json"), schemaBuf);
  const schema = JSON.parse(schemaBuf.toString("utf8"));
  log(`\n✅ schema.json (${schemaBuf.length}b) → scripts/out/schema.json`);
  log(
    `   archetype=${schema?.meta?.archetype} fields=${schema?.fields?.length} parserNotes=${schema?.parserNotes?.length ?? 0}`,
  );

  // ── BUILD ──
  await runTurn(
    client,
    session.id,
    `BUILD turn. Usa EXACTAMENTE este esquema confirmado y construye la mini-app del paciente en /mnt/session/outputs/index.html (un solo archivo HTML autocontenido, móvil-first, localStorage, acentos en español preservados):\n\n${JSON.stringify(schema)}`,
    "BUILD turn",
  );
  const htmlBuf = await downloadOutput(client, session.id, "index.html");
  await writeFile(join(OUT, "index.html"), htmlBuf);
  log(`\n✅ index.html (${htmlBuf.length}b) → scripts/out/index.html`);

  log(`\n🎉 done. Open scripts/out/index.html in a browser.`);
  log(`   session ${session.id} left alive for inspection (delete later).`);
}

main().catch((e) => {
  console.error("\n✖ engine-smoke failed:", e?.message ?? e);
  if (e?.error) console.error(JSON.stringify(e.error, null, 2));
  process.exit(1);
});
