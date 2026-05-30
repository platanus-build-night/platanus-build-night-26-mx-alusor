import Anthropic from "@anthropic-ai/sdk";

// Lazy singleton — only instantiate on first use, so `next build` never fails
// constructing the client when ANTHROPIC_API_KEY isn't present at build time.
// The SDK auto-sets the managed-agents beta header on client.beta.* calls; the
// constant below is only passed explicitly to files.list when using scope_id.
let _client: Anthropic | undefined;

export function getAnthropic(): Anthropic {
  _client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export const MANAGED_AGENTS_BETA = "managed-agents-2026-04-01";

// Models (verified): build engine = Opus; chat/orchestrator = Sonnet.
export const BUILD_ENGINE_MODEL = "claude-opus-4-8";
export const ORCHESTRATOR_MODEL = "claude-sonnet-4-6";
