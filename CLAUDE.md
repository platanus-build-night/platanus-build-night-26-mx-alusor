# DocToApp

Turn a health professional's Word `.docx` template into a self-contained single-file HTML mini-app their patient fills on a phone. Hackathon MVP (open source; seeds an internal Terapify product).

## Architecture (two brains)
- **Orchestrator** — `claude-sonnet-4-6` in a Vercel AI SDK v6 `streamText` loop (`/api/chat`, CLARIFY only): editable schema card + ≤3 `askQuestion` human-in-the-loop. Never parses/builds.
- **Build engine** — `claude-opus-4-8` Claude **Managed Agent** (cloud sandbox + official `docx`/`pdf` skills): the only thing that reads the docx. PARSE → writes `/mnt/session/outputs/schema.json`; BUILD → writes `/mnt/session/outputs/index.html` (write→review→edit); REFINE via steering turns to the same stateful session.
- **Build delivery**: fire-and-forget kickoff (`/api/build`) + webhook completion source-of-truth (`/api/webhooks/anthropic`) + client polls `/api/build/[id]/status`. Runs async on Anthropic → **plan-agnostic (works on Vercel Hobby)**. Dev uses a synchronous re-tail.

## Source of truth
- **`spec/`** — agent contracts: `intermediate-schema.schema.json`, `prompts/*.system.md`, `build-output-contract.md`, `examples/`. See `spec/README.md`.
- **`.claude/skills/`** — verified build skills: `claude-managed-agents`, `vercel-ai-sdk-v6`, `nextjs-vercel-stack`, `anthropic-document-skills`, `doctoapp-design-direction`. **Use them.**
- **`docs/mockups/`** — golden visual targets. **`examples/*.docx`** — real psychologist templates for testing (Registro de situaciones = demo star).

## Conventions
- Next 16 App Router, `src/`, alias `@/*`, Tailwind v4 (tokens in `src/app/globals.css`), zod **v4**, mongodb **v6**.
- Studio shell = light sage refined-minimal; generated patient apps get a **per-domain calm accent**.
- **Auth = Clerk** (`src/proxy.ts`, **fail-closed**: everything gated except a public allow-list). PUBLIC: `/` (landing), `/d/[slug]` (patient app, no login), `/api/webhooks/anthropic` (**must stay unauthenticated** — signed by Anthropic), `/sign-in`, `/sign-up`. GATED: `/panel`, `/builder`, all token-spending `/api/*` (chat/parse/build/refine/upload). Identity seam is still `getCurrentUser()` (`src/lib/user.ts`) → real Clerk user, or `DEV_USER` when `CLERK_SECRET_KEY` is unset (dev without keys). Env: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`.
- **Negotiation principle**: when a doc is outside the field catalog (grid/multi-subscale), the agent approximates + records a `parserNote` + the orchestrator proposes it to the professional — never fail silently.
- 3 archetypes: `tracker_recurrente`, `autoevaluacion_resultado` (single score + bands + mandatory disclaimer), `formulario_unico`. Patient data = localStorage; export = non-functional teaser.

## Plan (phases)
0 scaffold ✅ · 1 agentic engine (parse→schema→build→pull) · 2 chat + Gen UI · 3 persistence + Blob + `/d/[slug]` · 4 auth (deferred) · 5 polish + refine.
