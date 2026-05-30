# DocToApp — Agent Contracts (`spec/`)

Single source of truth for the two agent brains and the data they exchange. Code (the scaffold) imports/embeds these; keep them authoritative.

## Files
- **`intermediate-schema.schema.json`** — the intermediate schema as a strict JSON Schema (draft 2020-12). The boundary object between brains: Opus (parse turn) emits an instance to `/mnt/session/outputs/schema.json`; Sonnet presents/edits it as the schema card; Opus (build turn) consumes the confirmed instance. Valid against the official meta-schema.
  - 3 archetypes: `tracker_recurrente` (form+history+chart), `autoevaluacion_resultado` (form+result, single score+bands, **mandatory non-diagnostic disclaimer**), `formulario_unico` (form only).
  - Closed field catalog: `text, textarea, number, scale, select, multiselect, boolean, date, time, rating`. `scale` supports optional per-point `labels[]` (e.g. YSQ 1–6) plus `minLabel`/`maxLabel`.
  - `parserNotes[]` — how out-of-catalog structures are negotiated (see below).
  - `persistence: localStorage`; export is a non-functional teaser only.
- **`examples/`** — one validated instance per archetype (+ both trackers).
- **`prompts/build-engine.system.md`** — Opus (`claude-opus-4-8`) Managed Agent: parse `.docx` → write `schema.json` (JSON only) → build `/mnt/session/outputs/index.html` (write→review→edit) → refine via steering. Autonomous; never asks the user.
- **`prompts/orchestrator.system.md`** — Sonnet (`claude-sonnet-4-6`) in the AI SDK `streamText` clarify loop: present the schema card, ask ≤3 `askQuestion`s, surface `parserNotes` as proposals, hand the confirmed schema to build. Never parses or builds.
- **`build-output-contract.md`** — the "definition of done" checklist the generated single-file HTML must satisfy.

## Negotiation principle (first-class)
When a document has a structure **outside the MVP catalog** (2D weekly grid like Behavioral Activation, multi-subscale questionnaire like YSQ-III, body-map, …) the agent does **not** fail or silently mangle it. The parse turn represents it best-effort with the closest catalog fields **and** records a `parserNotes` entry `{sourceStructure, issue, proposedRepresentation}`. The orchestrator then **proactively proposes** that representation to the professional ("tu documento tiene X que no calza directo; lo representé como Y — ¿lo dejamos, lo ajustamos, o lo simplificamos?"). Hard structures become a collaborative choice.

## Golden test inputs
Real psychologist templates in `examples/` source docs (`../examples/*.docx`): Registro de situaciones (tracker, **demo star**), YSQ-III (autoeval — single-total approximation + parser-note), Programa de Activación conductual (grid → negotiated per-time-slot tracker).
