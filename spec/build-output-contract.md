# DocToApp — BUILD-OUTPUT CONTRACT (Definition of Done)

**Artifact under contract:** the single generated `/mnt/session/outputs/index.html` — one self-contained patient mini-app produced by the BUILD ENGINE (claude-opus-4-8 Managed Agent) from a CONFIRMED intermediate schema (v1.0).

**How to read this:** every item is a checkable pass/fail QA assertion. The agent must satisfy ALL items that apply to the schema it was handed. Items tagged **[tracker]**, **[autoeval]**, **[unico]** apply only to that `meta.archetype`; untagged items apply to every mini-app. The agent's build review loop (write → open/inspect → edit → re-verify) must end with every applicable box checkable. Anything not checkable is a defect, not a stylistic preference.

> Source of truth: the CONFIRMED schema is consumed **verbatim**. The contract never licenses inventing, dropping, renaming, reordering, or re-typing fields. Diacritics in every label/option/title pass through byte-for-byte.

---

## 1. File & delivery (self-contained single file)

1.1 Output is exactly one file at `/mnt/session/outputs/index.html`. No sibling CSS/JS/asset files are emitted or referenced.
1.2 All CSS is inline in a single `<style>` block (or `style=` attrs); all JS is inline in `<script>` blocks. No `<link rel="stylesheet">`, no external `.js`/`.css` `src`.
1.3 Zero network dependencies at runtime: no web fonts, no CDN, no Google Fonts, no analytics/trackers/beacons, no `fetch`/`XMLHttpRequest`/`navigator.sendBeacon`. The app works fully offline (open `file://` and use it). It is health data — no exfiltration of any kind.
1.4 The ONLY permitted external-ish dependency is a charting helper, and only for `[tracker]` apps: either an **inline-SVG** chart (preferred, default) OR Chart.js. If Chart.js is used it must be **inlined into the file** (not a CDN `<script src>`); inline-SVG is the default and keeps the file lean.
1.5 No other libraries (no jQuery, React, Tailwind CDN, icon-font packages, etc.).
1.6 Total file size target **< ~60 KB**. Inline-SVG charts are favored precisely to hit this; inlining Chart.js is allowed but counts against the budget — justify it only if SVG cannot do the job.
1.7 Document head: `<!doctype html>`, `<html lang="es">`, `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, and a `<title>` set to `meta.title` (accents intact).
1.8 Valid, well-formed HTML; no unclosed tags; renders without parser errors.

## 2. Console & runtime health

2.1 **Zero console errors and zero uncaught exceptions** on load, on every tab switch, on form submit, on save, on history render, and on chart render.
2.2 No console warnings from the app's own code (third-party noise from an inlined Chart.js excepted, but prefer none).
2.3 No runtime crash when `localStorage` is empty (first run), when it holds one entry, and when it holds many entries.
2.4 No crash on malformed/legacy stored data: reads are defensively parsed (try/catch around `JSON.parse`); a corrupt store degrades to the empty state rather than throwing.

## 3. Schema fidelity — render EVERY field with the correct control

3.1 **Every** field in `fields[]` is rendered, in the **same order** as the schema. No field is omitted, duplicated, merged, or invented.
3.2 Each field shows its **icon + label header**: the schema `label` verbatim (accents preserved) preceded by a small (~18–20px) line icon. Use `field.icon` (lucide-style name) when present; otherwise a quiet sensible default. The icon is inline-SVG (no icon font/CDN).
3.3 `field.help` (when present) is rendered as helper text near the control; `field.placeholder` (text/textarea/number only) is applied as the input placeholder.
3.4 `field.required === true` is enforced on submit (the entry cannot be saved/computed without it) and is visibly indicated; non-required fields save fine when blank.
3.5 Each control type maps exactly as follows, and validates against the schema's per-type rules:
- **text** → single-line `<input type="text">`.
- **textarea** → multi-line `<textarea>` (auto/vertical resize ok).
- **number** → `<input type="number">` honoring `min`/`max`/`step`; `unit` rendered as an adjacent suffix (e.g. "vasos", "g", "min"). Patient-entered value stored as a number.
- **scale** → **emoji-anchored row** (see §4). Integer `min`..`max`, honoring `step`; `minLabel`/`maxLabel` shown as the word poles when present; when a per-point `labels[]` array is present, each point carries its own label (see §4.7).
- **select** → single-choice control over `options[]` (native `<select>` or a single-select radio/segmented group); stores the option `value`, displays the `label`.
- **multiselect** → multiple-choice control over `options[]` (checkbox group or multi-toggle chips); stores an array of `value`s.
- **boolean** → a clear two-state control (switch/checkbox) with an accessible label; stores true/false.
- **date** → `<input type="date">`. (See §5 on the tracker entry key.)
- **time** → `<input type="time">`.
- **rating** → choice over `options[]` rendered as tappable cards/segments; if an option carries an `emoji`, it is shown on that option. Stores the option `value`.
3.6 `options[]` `label`s are rendered verbatim (accents preserved); stored data uses option `value`s, never the localized label.
3.7 No control surfaces an attribute the schema forbids for that type (e.g. no placeholder on a scale/select; no unit on text). The build must not "enrich" a field beyond its schema.
3.8 `meta.title` and (when present) `meta.subtitle` and `meta.intro` are rendered in the header / above the form, verbatim with accents.

## 4. Emoji-anchored scale (REQUIRED rendering for `scale`)

4.1 A `scale` field renders as a **horizontal row of numbered buttons** spanning integer `min`..`max` (e.g. 1–10 or 0–3), each a real `<button>` (not a `<div>`), each ≥48px tall and ≥44px wide.
4.2 A **sad face emoji at the LEFT pole and a calm/content face emoji at the RIGHT pole** flank the number row (matching the golden mockup). These two faces are the ONLY sanctioned emoji-as-UI in the app.
4.3 When `minLabel`/`maxLabel` exist, the word labels (e.g. "Nada" … "Mucho", "Con hambre" … "Muy satisfecho") are shown at the poles alongside the faces.
4.4 The selected button is filled with `--primary` (accent) and exposes `aria-pressed="true"`; the rest are unselected. Exactly one value is selectable; the chosen integer is stored.
4.5 The row is keyboard-operable (focusable buttons, arrow/tab navigation acceptable) and wraps gracefully on a 360px screen without horizontal scroll.
4.6 `emojiScale` defaults on for mood/intensity scales; if a schema explicitly sets `emojiScale:false`, the faces may be omitted but the numbered-button row and word poles remain.
4.7 **Per-point labels (`labels[]`).** When a `scale` field carries an OPTIONAL `labels[]` array — one human-readable label per point across `min`..`max` (e.g. a YSQ 1–6 Likert: "Completamente falso", "Mayormente falso", … "Me describe perfectamente") — the build renders a **labeled segmented / radio row** where each point shows BOTH its integer AND its own label, rather than only the min/max word anchors. Each point is a real, individually selectable `<button>`/radio with the per-point label as its accessible name (the label text visible inline, stacked/wrapped, or via an adjacent legend so it stays legible at 360px), `aria-pressed`/checked on the chosen one. `labels[]` is ADDITIVE to `minLabel`/`maxLabel` and to the numbered buttons — it does not replace §4.1's integer buttons, it annotates each of them. `labels.length` must equal the number of points (`(max - min)/step + 1`); if it does not, fall back to the bare numbered row with `minLabel`/`maxLabel` poles and do not invent labels. Accents in every per-point label pass through verbatim (§14).

## 5. Persistence — localStorage only

5.1 `persistence` is always `"localStorage"`. Patient data is stored only in `localStorage`; nothing is sent anywhere (re-asserts §1.3).
5.2 A stable, app-specific storage key namespace is used (e.g. derived from the title/slug) so two different mini-apps on the same origin do not collide.
5.3 **[tracker]** Each saved entry is **keyed by date** (one logical entry per the relevant day, per `meta.frequency` cadence). Saving on a date that already has an entry updates/overwrites that day's entry rather than silently creating a duplicate or a second conflicting record; entries are retrievable in reverse-chronological order.
5.4 **[tracker]** Past entries are **editable** (forgiving UX): the patient can open a previous entry, change it, and re-save.
5.5 **[autoeval]** The questionnaire responses + computed score/band may be stored for the current result; no history list is built (see §7).
5.6 **[unico]** A single submission is stored (or simply confirmed); no per-date history is accumulated.
5.7 Stored shape round-trips: values written on save are read back into the form/history correctly on reload (numbers stay numbers, multiselect stays an array, dates stay ISO-ish strings).

## 6. Form view ("Hoy") & save behavior — all archetypes

6.1 `views.form` is always `true`; the form/data-entry view is the default landing view, labeled **"Hoy"**.
6.2 A single primary **"Guardar"** button in `--primary`, full-width, ≥52px tall.
6.3 On save: required-field validation runs first; on success the entry is persisted (§5) and a quiet, **text** save confirmation appears (e.g. "Guardado ✓") in an `aria-live="polite"` region — not an icon-only signal.
6.4 **[unico]** A `formulario_unico` shows **form only** (no Historial tab, no result, no chart). After saving it shows a clear save/thank-you confirmation; re-opening shows the saved submission or a clean form per design intent. No history view exists.
6.5 Header shows the title, optional subtitle, and today's date.

## 7. History view + chart — `[tracker]` only

7.1 **[tracker]** `views.history === true`; a second view labeled **"Historial"** (a.k.a. "Tu progreso") exists and is reachable from the bottom tab bar.
7.2 **[tracker]** Historial shows an **"Entradas recientes"** reverse-chronological list: each row shows the entry date and a colored value badge for the tracked field; rows are tappable to expand/edit/delete.
7.3 **[tracker]** When `views.chart` is present, an inline chart of `views.chart.field` over time is rendered: chart `type` (`line`/`bar`/`area`) honored, single `--primary`-colored series, soft gridlines, a date axis, and the chart `title` shown when present (e.g. "Intensidad de la emoción (1-10)"). Latest value shown prominently.
7.4 **[tracker]** The chart references a real number/scale/rating field id from the schema (referential integrity already guaranteed upstream); it is hand-rendered inline-SVG by default (Chart.js only if inlined per §1.4). No rainbow palette — one accent series.
7.5 **[tracker]** Chart and list stay legible on a 360–390px phone; with 0 entries the chart area shows a friendly empty state instead of a broken/zero-axis graphic (see §11).
7.6 **[tracker]** History and chart are **forbidden** for non-tracker archetypes — they must not appear in `[autoeval]` or `[unico]` outputs.

## 8. Scoring, result & MANDATORY disclaimer — `[autoeval]` only

8.1 **[autoeval]** `views.result === true` and a `scoring` object is present; a **"Resultado"** view renders the computed outcome (no Historial, no chart).
8.2 **[autoeval]** Score computation matches `scoring.method`:
- `sum` → sum of the numeric values of each `inputs[].field`.
- `weighted` → sum of `value × weight` for each input (every input carries a `weight`).
Stored option `value`s for rating/select inputs are coerced to numbers for scoring.
8.3 **[autoeval]** The computed score is mapped to exactly one `bands[]` entry by inclusive `[min,max]`; the band `label` is shown, the band `message` (when present) is shown as supportive non-diagnostic guidance, and `severity` (when present) drives only a sober color badge — not alarm-red.
8.4 **[autoeval] MANDATORY:** the non-empty `scoring.disclaimer` (es-MX, accents intact) is **always** displayed with the result. The result view must never render without the disclaimer. This is a hard gate — missing/empty disclaimer = build fails.
8.5 **[autoeval]** No diagnostic/medical-verdict language is introduced beyond the schema's band labels/messages; the tool presents itself as self-assessment support.
8.6 **[autoeval]** Scoring/result are **forbidden** for `[tracker]` and `[unico]`.

## 9. Navigation — bottom tab bar

9.1 A fixed **bottom tab bar** is present for `[tracker]` apps with exactly two tabs: **"Hoy"** and **"Historial"**, each with a lucide-style line icon + Spanish label.
9.2 The active tab is tinted with `--primary` and marked `aria-current="page"`; switching tabs swaps views with no full reload and no console error.
9.3 The tab bar respects `env(safe-area-inset-bottom)`; page bottom padding accounts for the bar so content is never hidden behind it.
9.4 **[autoeval]/[unico]** that have a single meaningful view do not show a misleading "Historial" tab; navigation degrades to just the form (and result view for autoeval) without an empty/broken second tab.

## 10. Layout, mobile-first & aesthetic

10.1 **Mobile-first**: designed at 360–390px, single column always, no horizontal scroll at that width; enhances up to a centered `max-width: ~34rem`.
10.2 Calm/sober refined-minimal look reusing the studio palette as plain CSS vars: warm paper bg, warm-ink text, soft hairline borders, ~10px radius. No gradients, no heavy shadows (hairline max), no glow, no AI-slop.
10.3 No decorative emoji used as generic UI icons anywhere — the mood-scale poles (§4.2) are the only exception.
10.4 Optional dark mode via `prefers-color-scheme: dark` using the same vars; both light and dark pass contrast (§12).
10.5 8px-ish spacing rhythm; tappable rows separated by ≥12px.

## 11. Empty & first-run states

11.1 First-run (empty `localStorage`) renders cleanly with no errors and a **friendly empty state** (plain es-MX), not a blank or broken screen.
11.2 **[tracker]** Empty Historial shows a friendly "aún no hay registros"-style message and an inviting empty chart placeholder (no NaN axes, no zero-division).
11.3 The form is fully usable on first run with no prior data.

## 12. Accessibility (a11y)

12.1 Semantic HTML: `<form>`, `<label for>` (or wrapping labels) on every control, `<fieldset>`/`<legend>` for scales and choice groups, real `<button>`s (never clickable `<div>`s).
12.2 Touch targets **≥ 48×48px**; inputs use **`font-size: 16px+`** to prevent iOS zoom.
12.3 Color contrast **≥ 4.5:1** for text and for `--primary` as a button background with its ink — in both light and dark.
12.4 Visible **focus ring** on every interactive element (`:focus-visible`); fully **keyboard-operable** (tab order logical, scales/choices reachable and selectable by keyboard, tabs switchable by keyboard).
12.5 Save confirmations and dynamic status use `aria-live="polite"`; the selected scale/choice state is conveyed via ARIA (`aria-pressed`/`aria-current`/checked state), not color alone. For a per-point-labeled scale (§4.7), each point's accessible name carries its own label so a screen reader announces the meaning, not just the integer.
12.6 `prefers-reduced-motion: reduce` honored — all transitions/animations disabled under it; the only motion otherwise is a ≤150–250ms fade on save.
12.7 Screen-reader sanity: every field is announced with its accented Spanish label; icons are decorative (`aria-hidden`) so they don't pollute the accessible name.

## 13. Per-domain accent (single swappable `--primary`)

13.1 The accent is exposed as a **single `--primary` CSS var** (plus `--primary-ink`) such that changing one value re-themes buttons, the active scale button, the chart series, active tab, and the focus ring.
13.2 `--primary` is set from `meta.theme.accent` per the locked mapping — sage (mental-health/nutrition), blue (sleep), terracotta (pain/body), teal (weekly), amber (draft/unclassified) — using `theme.accentHex`/`theme.accentInk` when the schema overrides them.
13.3 The accent is rare (buttons / active states / one chart series / focus ring); large surfaces stay warm-neutral, never accent-tinted.

## 14. Spanish copy — PRESERVE ACCENTS (non-negotiable)

14.1 Every patient-facing string from the schema (`meta.title`, `subtitle`, `intro`, field `label`s, `help`, option `label`s, scale per-point `labels[]`, band `label`/`message`, `disclaimer`) renders **verbatim with diacritics intact** — Situación, Emoción, Pensamiento alternativo, Dra. López, ¿Cómo te sentiste?, día, información. No normalization to ASCII, no dropped `¿`/`¡`.
14.2 UI chrome the app adds itself (Guardar, Hoy, Historial, Compartir resultados, Guardado, empty-state copy) is correct es-MX with accents.
14.3 `<meta charset="utf-8">` + `lang="es"` ensure accents render; no mojibake anywhere in the rendered page.

## 15. "Compartir resultados" teaser — non-functional (export DEFERRED)

15.1 When `share.teaser === true`, a **"Compartir resultados"** button (label from `share.label`, default "Compartir resultados") is rendered — for `[tracker]` at the bottom of Historial, otherwise on the appropriate results/end screen.
15.2 The button is **inert**: it does NOT download a file, generate JSON/CSV, copy data, or open a real share sheet. It may show a quiet "Próximamente"/disabled affordance.
15.3 It must not throw, must not pretend success, and must not transmit any data (re-asserts §1.3).

## 16. Transparency — the built app reflects the AGREED representation

16.1 The built app renders the schema it was handed and **nothing else**: it is the faithful UI of a representation the professional already saw and confirmed in the CLARIFY phase. The build introduces no structure, field, or interpretation that is not in the CONFIRMED schema.
16.2 **Out-of-catalog structures were approximated, not silently mangled.** When the source document carried a structure outside the MVP field catalog (e.g. a 2D weekly grid like Behavioral Activation, a multi-subscale questionnaire like YSQ-III scored as a single approximated total, a body-map), the PARSE turn recorded it in the top-level `parserNotes[]` array (`{sourceStructure, issue, proposedRepresentation}`) and the orchestrator proactively proposed that representation to the professional, who co-decided. The build is the realization of THAT agreed proposal — the closest catalog representation the professional confirmed.
16.3 For every `parserNotes[]` entry, the built UI must match the `proposedRepresentation` that was confirmed (e.g. a YSQ-III approximated to a single total renders as one `scale`/scoring flow, not a fabricated multi-subscale breakdown the catalog cannot express). The build never re-invents the original out-of-catalog structure behind the scenes, and never quietly upgrades the approximation beyond what was agreed.
16.4 Where an approximation materially shapes what the patient sees (e.g. a single total standing in for what the doc framed as several subscales), the app stays honest: it presents only what the confirmed representation supports and never claims a fidelity (per-subscale results, a true 2D grid, a real body-map) it does not implement. Any non-diagnostic disclaimer (§8.4) remains mandatory when scoring is present.
16.5 `parserNotes[]` is provenance, not patient-facing copy: its `issue`/`sourceStructure` text is NOT surfaced to the patient. It governs WHICH representation the build must honor; it does not get rendered into the mini-app UI.

---

## QA gate — build is "done" only when:
all untagged items pass, plus the items for `meta.archetype`, with the three hard gates green: **(a)** every schema field rendered with the correct control (§3) — including per-point-labeled scales (§4.7), **(b)** for `[autoeval]`, the score+band+**MANDATORY disclaimer** all present (§8.1–8.4), and **(c)** zero console errors across load/save/navigation/chart (§2). Diacritics intact (§14), self-contained < ~60 KB (§1), localStorage-only (§5), and the output faithfully reflects the AGREED representation tied to `parserNotes[]` (§16).
