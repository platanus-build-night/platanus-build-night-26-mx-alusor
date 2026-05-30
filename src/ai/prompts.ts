import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The system prompts are the single source of truth in spec/prompts/*.md.
// Read at runtime from the repo root (works in `next dev`; for Vercel the
// spec/ dir is included via next.config outputFileTracingIncludes).

const SPEC = join(process.cwd(), "spec", "prompts");

function read(name: string): string {
  return readFileSync(join(SPEC, name), "utf8");
}

let _build: string | undefined;
let _orchestrator: string | undefined;

/** Opus build-engine (Managed Agent) system prompt. */
export function buildEngineSystemPrompt(): string {
  return (_build ??= read("build-engine.system.md"));
}

/** Sonnet orchestrator (clarify) system prompt. */
export function orchestratorSystemPrompt(): string {
  return (_orchestrator ??= read("orchestrator.system.md"));
}
