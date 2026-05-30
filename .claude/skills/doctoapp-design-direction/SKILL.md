---
name: doctoapp-design-direction
description: "Opinionated visual design direction for DocToApp — the studio (Next.js 16 + React 19 + Tailwind v4 + shadcn/ui) AND the generated single-file patient mini-apps. Use when building or styling any UI in this repo: pages, layout, fonts, color tokens, the chat/Generative-UI surface, shadcn component choices, OR when writing the HTML-builder prompt/template for the patient mini-apps. Enforces a calm, sober, trustworthy refined-minimalism aesthetic (health/therapy adjacent) and bans generic AI-slop (Inter/Roboto, purple-on-white gradients). Complements the frontend-design skill; does not replace it."
---

# DocToApp — Design Direction

This skill is the **house style** for DocToApp. It is a concrete, opinionated layer **on top of** the `frontend-design` skill. Read `frontend-design` first for general craft (it covers typography quality, motion craft, avoiding AI-slop). This skill **overrides its "pick a BOLD/extreme tone" instinct**: DocToApp's committed direction is **refined minimalism — calm, sober, trustworthy**. The product is health/therapy adjacent, used by clinicians and their patients, so the aesthetic must feel like a quiet, well-made clinical instrument, not a flashy SaaS landing page. Execute restraint with precision; elegance comes from spacing, type, and one or two confident details — not from effects.

There are **two distinct surfaces** with shared DNA but different rules:
1. **The Studio** — the authenticated Next.js app the clinician uses (upload, chat, review, share). Stack: Next 16 App Router, React 19, Tailwind v4, shadcn/ui.
2. **The Generated Patient Mini-App** — a single self-contained `index.html` (inline CSS+JS, localStorage, hosted on Vercel Blob, public at `/d/[slug]`). No build step, no framework, no shadcn. Must be calm, mobile-first, large touch targets, low-tech-patient friendly. **The studio's Claude Managed Agent builds these, so the mini-app rules below must be embedded into the builder's system prompt / skill — see the last section.**

---

## Golden visual targets — the mockups ARE the spec

`docs/mockups/*.png` are **confirmed, signed-off visual targets**. When building any DocToApp UI, open the relevant mockup and match it; do not reinvent layout. The four mockups and what each one locks in:

- **`doctoapp-paciente-mobile.png`** — the patient mini-app, both screens. **Hoy** screen: title "Diario de pensamientos" + subtitle "con Dra. López", icon+label field headers (Situación, Emoción, Pensamiento alternativo), an **emoji-anchored scale** (a sad face at the left end → a calm/content face at the right end, with a row of numbered 1–10 buttons between them), a single green **"Guardar"** primary button, and a **bottom tab bar with two tabs: Hoy / Historial**. **Historial/"Tu progreso"** screen: an inline line **chart** of the tracked numeric field ("Intensidad de la emoción (1-10)") with soft gridlines + a sage line, an "Entradas recientes" list (date + a colored value badge per entry), and a **"Compartir resultados"** button (teaser only — see deferred note).
- **`doctoapp-builder-split-view.png`** — the **clinician build screen** = the hackathon pro-side target. **Split view: chat/build column on the LEFT, a live mobile-frame patient preview ("Vista del paciente") on the RIGHT** with a phone/desktop device toggle. Left column shows: the uploaded docx card ("diario-pensamientos.docx"), a **"Campos detectados"** list with field-type pills (Texto largo, Escala 1-10, …), an inline **clarify question card** with answer chips/Likert buttons, a **"Construyendo UI" progress bar** during build, and the chat composer. Top-right: a green **"Compartir"** button.
- **`doctoapp-dashboard-herramientas.png`** — the simple **"Mis herramientas"** grid = the other pro-side target for the hack. A calm card grid; **each card carries its own per-domain accent** (Diario CBT = sage, Diario de alimentos = sage/green, Bitácora ejercicios = amber, Registro de sueño = muted blue, Dolor (body-map) = terracotta, Check-in semanal = teal), a domain icon, a mini-preview, "Editada hace …", an "activa" badge, and per-card actions "Abrir herramienta" / "Compartir". Header has a "+ Nueva herramienta" button.
- **`doctoapp-modal-compartir.png`** — the **big clinician dashboard** (left sidebar nav Resumen/Herramientas/Pacientes/Reportes…, summary stats, "Actividad reciente") with a **"Compartir herramienta" modal**: a copyable share link shown as **`doctoapp.app/d/diario-cbt`**, a QR code, a suggested patient message, and "Copiar link". **This big patients/analytics dashboard is ROADMAP, not the hack** — build only the share-link/QR pattern from it if needed. It is also the visual confirmation of the **`/d/[slug]`** public URL.

> The mini-app and the studio share DNA (warm paper, sage, soft borders, Spanish copy) but the mini-app is hand-authored vanilla while the studio is shadcn. Don't let them drift apart visually.

---

## North Star (applies to both surfaces)

- **Sober, not sterile.** Warm neutrals + one restrained accent. Lots of whitespace. Content-forward.
- **Trust signals over delight tricks.** Predictable layouts, clear labels, generous hit areas, honest empty states. No dark patterns, no fake urgency.
- **Motion is a whisper.** 150–250ms ease-out on enter/hover only. No parallax, no bounce, no scroll-jacking, no looping ambient animation. Respect `prefers-reduced-motion`.
- **Type does the work.** A characterful humanist/serif display paired with a clean, slightly warm sans for body. Strong hierarchy through size/weight/measure, not color.
- **Spanish (es-MX) is the product language.** All copy ships in Spanish; **preserve diacritics exactly** (see the dedicated rule below).
- **Banned (AI-slop):** Inter, Roboto, Arial, system-ui as the brand font; purple→blue gradients on white; glassmorphism everywhere; neon glow; emoji as generic UI iconography; rainbow chart palettes; centered-everything hero with a gradient blob. (Exception: the **emoji faces that anchor a mood scale** are an intentional, mockup-confirmed affordance — that is a labeled scale endpoint, not decorative iconography.)

---

## Spanish copy — PRESERVE ACCENTS (non-negotiable)

All generated and authored copy is Spanish (es-MX, Terapify audience). **Never strip diacritics or special characters.** This applies to studio UI strings, schema field labels surfaced to the patient, and everything the Managed Agent writes into the mini-app.

- Correct: **Situación, Emoción, Pensamiento alternativo, Dra. López, ¿Cómo te sentiste?, Guardar, Compartir resultados, Día, Información.**
- Wrong (do not ship): "Situacion", "Emocion", "Lopez", "Como te sentiste", missing `¿`/`¡`.
- The mini-app `<html lang="es">`, `<meta charset="utf-8">`, and any blob/download filenames must keep UTF-8 so accents render. When the agent infers labels from the docx, it must **carry the original accented Spanish through verbatim** — inferring a field is "Situación" must not silently normalize to ASCII.

---

## Typography

Do **not** use Inter/Roboto. DocToApp pairs a warm humanist serif for display with a calm grotesque-humanist sans for UI/body. Two committed choices (pick **Option A** as the default; B is the fallback if A feels too editorial):

- **Option A (default): `Fraunces` (display) + `Public Sans` (body/UI).**
  - Display / headings: **Fraunces** (variable, optical-size + soft serifs → warm, human, "made by a person"). Use it for h1–h3, the wordmark, and large numerals in the dashboard.
  - Body / UI: **Public Sans** (variable, neutral-but-warm, excellent legibility, accessible by design — it's literally the US gov design system font, which reads "trustworthy/clinical" without being cold).
- **Option B (more clinical/quiet): `Newsreader` (display) + `Spline Sans` (body).** Newsreader is a softer reading serif; Spline Sans is a humanist UI sans.

Mono (for code/IDs/timestamps in the studio only): **`JetBrains Mono`** or **`IBM Plex Mono`**. Patients never see mono.

### Loading fonts — Next 16 + Tailwind v4

`next/font/google` self-hosts, zero layout shift, no requests to Google. Use the `variable` option and wire into Tailwind v4 via `@theme inline`. **In Tailwind v4 there is no `tailwind.config.js` fontFamily — you map the CSS var inside `@theme inline` in `globals.css`.**

```ts
// app/fonts.ts
import { Fraunces, Public_Sans, JetBrains_Mono } from "next/font/google";

export const fontDisplay = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["opsz", "SOFT", "WONK"], // optional Fraunces axes; keep subtle
});

export const fontSans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-brand",
});

export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-brand",
});
```

```tsx
// app/layout.tsx
import "./globals.css";
import { fontDisplay, fontSans, fontMono } from "./fonts";
import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es" // primary audience is es-MX (Terapify); set per-locale
      suppressHydrationWarning
      className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable} antialiased`}
    >
      <body className="min-h-dvh bg-background text-foreground font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

> Note: default theme is `light` (calm/clinical), not `system`, so the brand reads as intended on first paint; users can still flip. Keep `enableSystem` so it respects OS preference once toggled. Note `latin` subset includes the accented glyphs Spanish needs.

### Type scale (studio)

Use a modest scale; resist huge heroes. `clamp()` for fluid display only.
- Display h1: `clamp(2rem, 1.4rem + 2.5vw, 3rem)`, `font-display`, weight 480–560, `tracking-tight`, `leading-[1.05]`.
- h2: `1.5rem`, font-display, weight 500. h3: `1.25rem`, font-sans, weight 600.
- Body: `1rem`/`1.625` line-height. Small/meta: `0.875rem`, `text-muted-foreground`.
- Measure: cap body text at `max-w-[68ch]` (prose) / forms at `max-w-prose`.

---

## Color System

Use shadcn/ui's token architecture (semantic CSS vars in oklch, mapped via `@theme inline`) but with a **custom calm palette** — do **not** ship the default zinc/neutral grays as the brand; they read generic. DocToApp = **warm paper neutrals + a single muted sage/teal-leaning primary** (calming, health-coded without being "hospital blue" cliché or wellness-green cliché). Keep chroma low everywhere; the accent earns its saturation by being rare.

**The DocToApp studio shell itself is locked to sage refined-minimal** — the per-domain accent theming described later applies to the *generated patient apps* (and to the per-card accent dots in the "Mis herramientas" grid), **not** to the studio chrome.

Paste this into `app/globals.css`. It uses the verified shadcn v4 token names and `@theme inline` mapping, with values retuned for DocToApp.

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  /* Brand fonts (wired from next/font variables) */
  --font-display: var(--font-display);
  --font-sans: var(--font-sans-brand);
  --font-mono: var(--font-mono-brand);
}

:root {
  --radius: 0.625rem; /* 10px — soft but not pill-y */

  /* Warm paper neutrals (very low chroma, slight warm hue ~85) */
  --background: oklch(0.992 0.003 95);     /* near-white warm paper */
  --foreground: oklch(0.255 0.012 75);     /* warm near-black ink */
  --card: oklch(1 0 0);
  --card-foreground: var(--foreground);
  --popover: oklch(1 0 0);
  --popover-foreground: var(--foreground);

  /* Primary: muted sage/teal — calm, health-coded, low chroma */
  --primary: oklch(0.52 0.045 175);
  --primary-foreground: oklch(0.985 0.004 95);

  --secondary: oklch(0.965 0.006 90);
  --secondary-foreground: oklch(0.32 0.01 75);
  --muted: oklch(0.965 0.006 90);
  --muted-foreground: oklch(0.52 0.012 80);
  --accent: oklch(0.95 0.012 175);          /* faint sage tint for hovers */
  --accent-foreground: oklch(0.30 0.03 175);

  --destructive: oklch(0.55 0.16 27);       /* restrained clay-red, not alarm-red */
  --border: oklch(0.90 0.006 90);
  --input: oklch(0.90 0.006 90);
  --ring: oklch(0.52 0.045 175 / 55%);      /* primary-tinted focus ring */

  /* Charts: a calm, distinguishable, non-rainbow ramp (sage → clay → sand → slate → plum, all muted) */
  --chart-1: oklch(0.55 0.06 175);
  --chart-2: oklch(0.62 0.09 50);
  --chart-3: oklch(0.70 0.07 95);
  --chart-4: oklch(0.55 0.04 250);
  --chart-5: oklch(0.55 0.07 330);
}

.dark {
  /* Dark = warm charcoal, NOT pure black; keep the calm */
  --background: oklch(0.205 0.006 80);
  --foreground: oklch(0.94 0.004 90);
  --card: oklch(0.245 0.006 80);
  --card-foreground: var(--foreground);
  --popover: oklch(0.245 0.006 80);
  --popover-foreground: var(--foreground);

  --primary: oklch(0.70 0.06 175);          /* brighter sage so it reads on charcoal */
  --primary-foreground: oklch(0.18 0.01 80);

  --secondary: oklch(0.28 0.006 80);
  --secondary-foreground: oklch(0.94 0.004 90);
  --muted: oklch(0.28 0.006 80);
  --muted-foreground: oklch(0.70 0.008 85);
  --accent: oklch(0.30 0.02 175);
  --accent-foreground: oklch(0.92 0.01 175);

  --destructive: oklch(0.62 0.15 27);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 14%);
  --ring: oklch(0.70 0.06 175 / 55%);

  --chart-1: oklch(0.70 0.07 175);
  --chart-2: oklch(0.72 0.10 50);
  --chart-3: oklch(0.78 0.08 95);
  --chart-4: oklch(0.68 0.06 250);
  --chart-5: oklch(0.68 0.08 330);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
  /* Headings default to display face */
  h1, h2 { font-family: var(--font-display); letter-spacing: -0.01em; }
}
```

**Usage rules:** body/cards use `bg-background`/`bg-card`; primary actions use `bg-primary text-primary-foreground`; everything else is neutral. The sage accent should cover **<10%** of any screen — buttons, active nav, focus ring, the one chart line for "today." Never tint large surfaces with the accent.

---

## Per-domain accent theming (generated patient apps + dashboard cards)

Confirmed by `doctoapp-dashboard-herramientas.png` and `doctoapp-paciente-mobile.png`: each generated patient app gets **one sober accent chosen by its clinical domain**, so a sleep tool reads differently from a pain tool without ever becoming loud. **The studio shell stays sage**; the accent lives inside the generated mini-app and on the matching dashboard card.

The Managed Agent **must pick the accent during build** based on the inferred archetype/domain, and **write it into the schema's theme token** so the mini-app and the studio card agree. Keep all accents low-chroma and calm — they are still "refined minimalism," just hue-shifted.

| Domain / archetype | Accent | Approx hex (light) | Approx hue (oklch) |
| --- | --- | --- | --- |
| Mental health / mood / CBT diary | **sage green** (brand default) | `#3f7d72` | ~175 |
| Nutrition / food diary | **sage green** (shares brand sage) | `#3f7d72` | ~175 |
| Sleep / rest log | **muted blue** | `#5b7aa8` | ~250 |
| Pain / body-map | **terracotta** | `#b06a4f` | ~45 |
| Weekly check-in / general weekly | **teal** | `#3f8f8a` | ~190 |
| Draft / not-yet-classified | **amber** | `#c08a3e` | ~80 |

Contract: add a **`theme.accent`** (and optionally `theme.accentInk`) token to the patient-app schema/contract. The mini-app exposes it as a **single swappable `--primary`** CSS var (see the starter below), so changing the accent re-themes the whole app (buttons, active scale buttons, chart line, focus ring) by changing one value. The dashboard "Mis herramientas" card uses the same accent for its icon/preview tint. Default to sage; fall back to **amber** for unclassified drafts.

> Caveat: the exact hex/oklch values above are tuned-by-eye to match the mockups, not sampled from a locked design-token file. Treat them as the committed direction and adjust on first contrast check (each must pass ≥4.5:1 as a button background with white ink, and as a chart line on warm paper).

---

## Spacing, Rhythm, Shape

- **8px base grid.** Use Tailwind multiples (`gap-2/4/6/8`, `p-4/6/8`). Section vertical rhythm `py-12`/`py-16` on desktop, `py-8` mobile.
- **Radius:** `--radius: 0.625rem`. Cards `rounded-xl`, inputs/buttons `rounded-lg`, chips `rounded-md`. No fully-pill buttons (too "marketing").
- **Borders over shadows.** Prefer `border border-border` + subtle `shadow-xs`/`shadow-sm`. Avoid heavy drop shadows; one soft elevation level for popovers/dialogs only.
- **Density:** comfortable, not cramped. Form rows `space-y-5`; min field height 44px (also a touch target).
- **Layout:** single calm column for content; a quiet left sidebar in the studio (use shadcn `sidebar` tokens — already in the theme). Max content width `max-w-3xl`–`max-w-5xl`, centered. No asymmetric/diagonal grid-breaking here (that's `frontend-design`'s maximalist mode, which we are deliberately not in).

---

## Motion Restraint

- Durations 150–250ms, `ease-out` (enter) / `ease-in` (exit). Hover/focus transitions on `background-color`, `border-color`, `opacity`, `transform` only.
- One allowed "moment": a gentle staggered fade-up of chat messages / dashboard cards on first load (`animation-delay` 40–60ms steps, total < 400ms). Nothing loops.
- For React, if a motion lib is wanted use **Motion** (`motion/react`) sparingly; CSS transitions are usually enough. Always gate non-essential motion:
```css
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
```

---

## Component Strategy — shadcn/ui: **YES**

Use **shadcn/ui** (new-york style) for accessible Radix-backed primitives. It is the right call: copy-in components (we own/restyle them), Tailwind v4 + oklch token native, WAI-ARIA correct, and it keeps us from hand-rolling a11y. **Do not** pull a heavy component kit (MUI/Chakra/Ant) — they fight the aesthetic and bloat the bundle.

### Setup (Tailwind v4)

```bash
# Tailwind v4 first (Next 16 ships create-next-app with it; otherwise:)
npm install -D tailwindcss @tailwindcss/postcss postcss
# postcss.config.mjs:  export default { plugins: { "@tailwindcss/postcss": {} } }

# shadcn init (new-york is the only non-deprecated style)
npx shadcn@latest init
# choose: baseColor "neutral" (we override with our oklch vars anyway), cssVariables true
```

`components.json` (for Tailwind v4 leave `tailwind.config` empty):
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": { "config": "", "css": "app/globals.css", "baseColor": "neutral", "cssVariables": true },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "utils": "@/lib/utils",
    "hooks": "@/hooks"
  }
}
```

`lib/utils.ts` (the `cn` helper shadcn generates — clsx + tailwind-merge):
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

> After init, the shadcn CLI writes its own `:root`/`.dark` block into `globals.css`. **Replace those values with the DocToApp palette above** (keep the `@theme inline` mapping and token names). The CLI also adds the `@custom-variant dark` line — keep one copy.

### Primitives to install (and why)

```bash
npx shadcn@latest add button input textarea label form select checkbox \
  radio-group slider switch card dialog sheet popover tooltip \
  dropdown-menu tabs badge separator skeleton scroll-area sonner avatar \
  progress
```
- **Forms:** `form` (react-hook-form + zod), `input`, `textarea`, `select`, `checkbox`, `radio-group`, `slider` (great for the scale/Likert fields DocToApp infers), `switch`.
- **Chat / Generative-UI surface:** `card` (assistant message + the `askQuestion` tool's question card), `button`/`radio-group`/`slider` (the GenUI answer widgets), `scroll-area`, `skeleton` (streaming placeholders), `badge` (field-type pills, e.g. "Texto largo" / "Escala 1-10"), `tooltip`, `progress` (the "Construyendo UI" build bar in the split view).
- **App chrome:** `dialog`/`sheet` (mobile + the "Compartir herramienta" share modal with link + QR), `popover`, `dropdown-menu`, `tabs`, `separator`, `avatar`.
- **Feedback:** **`sonner`** for toasts. The legacy `toast` is deprecated — always use Sonner. Add `<Toaster richColors position="top-center" />` to root layout; trigger via `import { toast } from "sonner"`.
- **Icons:** **lucide-react** only (thin, calm line icons). One icon family, `size-4`/`size-5`, `stroke-[1.5]`. Never mix icon sets; never use emoji as generic UI icons (the mood-scale faces are a deliberate exception — they are labeled scale endpoints).
- **Charts (studio dashboard):** shadcn **`chart`** (Recharts wrapper) using `--chart-1..5` tokens. Line/area for trends, bar for counts. No 3D, no gradients-under-area heavier than ~12% opacity.

### Studio screen targets (build these for the hack)

- **Builder split-view** (`doctoapp-builder-split-view.png`) — the primary clinician screen. Two-pane: **left = the chat/build column** (uploaded `.docx` card, "Campos detectados" list with field-type `badge` pills, the inline `askQuestion` clarify Card, a `progress` "Construyendo UI" bar during build, and the sticky chat composer); **right = a live mobile-frame preview** ("Vista del paciente") of the generated `index.html` inside a phone bezel, with a phone/desktop device toggle. Header carries the wordmark and a primary "Compartir" button.
- **"Mis herramientas" grid** (`doctoapp-dashboard-herramientas.png`) — a calm responsive card grid of the clinician's tools. Each card: per-domain accent (icon/preview tint), domain icon, mini-preview, "Editada hace …", an "activa" `badge`, and "Abrir herramienta" / "Compartir" actions. Header "+ Nueva herramienta".
- **Share affordance** — a "Compartir herramienta" `dialog` exposing the **`/d/[slug]`** link (shown like `doctoapp.app/d/diario-cbt`), a copy button, and (nice-to-have) a QR + suggested patient message.
- **ROADMAP, not the hack:** the big analytics dashboard from `doctoapp-modal-compartir.png` (sidebar Resumen/Pacientes/Reportes, KPI tiles, "Actividad reciente"). Don't build it for the hackathon; reuse only its share-modal pattern.

### Generative-UI / chat styling rules

- Assistant turns: `Card` with `bg-card border-border`, comfortable padding, display face for any short heading inside. User turns: right-aligned, `bg-secondary` bubble, no avatar needed.
- The human-in-the-loop **`askQuestion`** tool renders a **question Card** with the prompt in body sans, the choices as a `radio-group`/`button` group/`slider` (match the field type being clarified — the mockup shows Likert chips like "0–3 / 1–5 / 1–10"), and a single primary "Confirm" button. Keep it inline in the stream, not a modal — it should feel like a calm conversation, not a popup.
- The **editable schema card** is the spine of the CLARIFY phase: it shows the inferred fields, their types as `badge` pills, and is editable in place; clarify answers refine it. Confirming it kicks off the build.
- Streaming: show `skeleton` lines or a 3-dot pulse (`animate-pulse`, reduced-motion safe). Never a spinner over the whole screen.
- Keep the chat column comfortable and centered with generous `py`; input is a sticky bottom `Textarea` (auto-grow) + send button, `rounded-xl border`.

---

## THE GENERATED PATIENT MINI-APP — Design Language

This is the artifact patients actually use, served at **`/d/[slug]`**. It is **one `index.html`** (inline `<style>` + `<script>`, `localStorage` for data, no network, no framework, no shadcn, no build). It must feel **like the same family as the studio** but is hand-authored vanilla and themed by its **per-domain accent**. The studio's Claude Managed Agent builds it agentically (write → preview → refine), so **embed these rules verbatim into the builder's system prompt / a bundled `mini-app-template.html`.** Match `doctoapp-paciente-mobile.png` closely.

### Hard requirements
- **Mobile-first.** Design at 360–390px width first; enhance up. Single column always. `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. `<meta charset="utf-8">` and `<html lang="es">` (accents must render).
- **Touch targets ≥ 48×48px.** Inputs/buttons min-height 48px, `font-size: 16px+` on inputs (prevents iOS zoom). Generous spacing between tappable rows (≥ 12px).
- **Accessibility:** semantic HTML (`<form>`, `<label for>`, `<fieldset>`/`<legend>` for scales, `<button>` not `<div>`), visible focus ring, `aria-live="polite"` for save confirmations, contrast ≥ 4.5:1, works keyboard-only and with screen readers, set `lang="es"`.
- **Low-tech friendly:** one clear task per screen/section; plain Spanish; obvious primary action; no jargon; autosave/explicit-save with a quiet "Guardado ✓"-style status (text, not just an icon); forgiving (can edit past entries).
- **Self-contained & resilient:** no external fonts/CDN by default (system font stack so it works offline and loads instantly). If a brand feel is wanted, use a clean system serif for the title only. **No analytics, no trackers** (it's health data).
- **Calm visuals:** reuse the studio palette as plain CSS vars (warm paper bg, warm-ink text, a single per-domain `--primary` accent, soft borders, 10px radius). Light + optional dark via `prefers-color-scheme`. No gradients, no shadows beyond a hairline, no animation beyond a 150ms fade on save.
- **Spanish copy with accents preserved** (see the dedicated rule above) — Situación, Emoción, Día, Información, etc.

### Structure every mini-app should have (mockup-confirmed)
1. **Header:** template title (the clinician's doc name, e.g. "Diario de pensamientos") + a tiny subtitle ("con Dra. López") and today's date.
2. **Icon+label field headers:** each field starts with a small lucide-style line icon + its accented Spanish label (Situación, Emoción, Pensamiento alternativo). The icon is a quiet affordance, sized ~`18–20px`, in `--muted` or the accent.
3. **The form fields** per the inferred schema — text, number, textarea, single/multi choice (big tappable cards/radios), and **scales as an emoji-anchored row** (see next item).
4. **Emoji-anchored scale (REQUIRED for mood/intensity scales):** a horizontal row of large numbered buttons (e.g. **1–10**, or **0–3** for short scales) with **a sad face emoji at the LEFT end and a calm/content face emoji at the RIGHT end** marking the two poles (matching `doctoapp-paciente-mobile.png`). Keep word labels too where the docx implies them ("Nada" … "Mucho"). Selected button fills with the accent. This is the one sanctioned emoji use.
5. **Save / new entry:** one big primary **"Guardar"** button in the accent color. Each submit appends a timestamped entry to `localStorage`.
6. **Bottom tab bar (REQUIRED):** a fixed two-tab bar at the bottom — **"Hoy"** (the form) and **"Historial"** (the progress/history view). Use clear lucide-style icons + the Spanish label; active tab tinted with the accent. Respect `env(safe-area-inset-bottom)`.
7. **History / "Tu progreso" view:** reverse-chronological "Entradas recientes" list (date + a colored value badge per entry, tap to expand; editable/deletable) **plus an inline-SVG line chart** of the primary tracked numeric/scale field over time — a single accent-colored line/area + soft gridlines + a date axis, titled with the field (e.g. "Intensidad de la emoción (1-10)"). **No chart libraries**; hand-render `<svg>`. Show the latest value prominently. Keep it legible on a phone.
8. **"Compartir resultados" button (TEASER, non-functional for the hack):** render the button at the bottom of the history view exactly as the mockup shows, but **export is DEFERRED** — it may show a "Próximamente" affordance / disabled-ish state and must NOT pretend to download. Do not wire real JSON/CSV export yet.

### Mini-app CSS starter (drop into the template / builder prompt)
The accent is a **single swappable `--primary`** the agent sets from `theme.accent`. Defaults to sage; swap the hex per the per-domain table (sleep `#5b7aa8`, pain `#b06a4f`, weekly `#3f8f8a`, draft `#c08a3e`).
```html
<style>
  :root{
    --bg:#f8f7f3; --ink:#2b2925; --muted:#6b675f; --card:#ffffff;
    --primary:#3f7d72; --primary-ink:#ffffff; /* <- set from schema theme.accent (sage default) */
    --border:#e7e3da; --radius:10px;
    --font: system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;
  }
  @media (prefers-color-scheme: dark){
    :root{ --bg:#23211d; --ink:#efece6; --muted:#a8a39a; --card:#2b2925;
           --primary:#6fb3a6; --primary-ink:#1a1916; --border:#3a372f; }
  }
  *{box-sizing:border-box} html{font-size:16px}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);
       line-height:1.55;padding:max(16px,env(safe-area-inset-top)) 16px calc(72px + env(safe-area-inset-bottom))}
  main{max-width:34rem;margin:0 auto}
  h1{font-size:1.5rem;letter-spacing:-0.01em;margin:.2rem 0}
  .field-label{display:flex;align-items:center;gap:.5rem;font-weight:600;margin:1.25rem 0 .4rem}
  .field-label svg{width:18px;height:18px;color:var(--muted)}
  input,textarea,select{width:100%;min-height:48px;font-size:16px;padding:.7rem .85rem;
       border:1px solid var(--border);border-radius:var(--radius);background:var(--card);color:var(--ink)}
  textarea{min-height:96px;resize:vertical}
  /* emoji-anchored scale: faces flank a row of numbered buttons */
  .scale-row{display:flex;align-items:center;gap:.5rem}
  .scale-face{font-size:1.5rem;line-height:1} /* sad face left, calm face right */
  .scale{display:flex;gap:.5rem;flex:1;flex-wrap:wrap}
  .scale button{flex:1 1 auto;min-width:44px;min-height:48px;border:1px solid var(--border);
       border-radius:var(--radius);background:var(--card);color:var(--ink);font-size:1rem}
  .scale button[aria-pressed="true"]{background:var(--primary);color:var(--primary-ink);border-color:var(--primary)}
  .btn{width:100%;min-height:52px;margin-top:1.5rem;border:0;border-radius:var(--radius);
       background:var(--primary);color:var(--primary-ink);font-size:1.05rem;font-weight:600}
  .btn-ghost{background:transparent;color:var(--primary);border:1px solid var(--border)} /* "Compartir resultados" teaser */
  /* bottom tab bar: Hoy / Historial */
  .tabbar{position:fixed;left:0;right:0;bottom:0;display:flex;background:var(--card);
       border-top:1px solid var(--border);padding-bottom:env(safe-area-inset-bottom)}
  .tabbar a{flex:1;display:flex;flex-direction:column;align-items:center;gap:.15rem;
       min-height:56px;justify-content:center;color:var(--muted);text-decoration:none;font-size:.8rem}
  .tabbar a[aria-current="page"]{color:var(--primary)}
  :focus-visible{outline:3px solid color-mix(in oklab,var(--primary),transparent 55%);outline-offset:2px}
  .status{color:var(--muted);font-size:.9rem;min-height:1.2em;transition:opacity .15s ease}
  @media (prefers-reduced-motion: reduce){*{transition:none!important;animation:none!important}}
</style>
```

### Builder review loop (what "agentic" means here)
The Managed Agent must: (1) pick the per-domain **accent** from the inferred domain and set `theme.accent`; (2) write `index.html` (Hoy form + Historial view + bottom tab bar, accents preserved in all Spanish copy); (3) **open/inspect it** (render check, validate the form matches the schema, check 48px touch sizes & contrast, confirm the emoji-anchored scale and tab bar render); (4) edit to fix; (5) verify localStorage save/load + the inline-SVG chart with sample data; (6) confirm es-MX copy reads plainly **with diacritics intact**; (7) confirm the "Compartir resultados" button is present but inert (export deferred). Ship only after the loop passes. Keep total file lean (target < ~60KB, no libraries).

---

## Quick Checklist Before Shipping Any UI
- [ ] No Inter/Roboto/system font as the brand; Fraunces + Public Sans (or Option B) wired via `next/font` `variable` + `@theme inline`.
- [ ] Studio palette is the warm-paper + muted-sage tokens (not default zinc), accent < 10% of screen; **studio shell stays sage**.
- [ ] Light is default; dark = warm charcoal, both pass contrast.
- [ ] shadcn new-york primitives used for anything interactive; lucide icons only; Sonner for toasts.
- [ ] Motion ≤ 250ms, one load moment max, `prefers-reduced-motion` honored.
- [ ] **Spanish accents preserved everywhere** (Situación/Emoción/López/¿…?) — never normalized to ASCII; UTF-8 charset set.
- [ ] **Studio targets match the mockups:** builder split-view (chat left, mobile-frame preview right) and the "Mis herramientas" card grid; big analytics dashboard treated as roadmap only.
- [ ] **Per-domain accent** chosen by the agent and written to `theme.accent` (sage MH/nutrition, blue sleep, terracotta pain, teal weekly, amber draft); dashboard card matches.
- [ ] **Mini-app matches `doctoapp-paciente-mobile.png`:** mobile-first, 48px targets, 16px inputs, semantic + a11y, self-contained, system fonts; **emoji-anchored scale (sad→calm faces), bottom tab bar (Hoy / Historial), icon+label field headers, history view with inline-SVG line chart**, and a **"Compartir resultados" teaser (export deferred / non-functional)**.
- [ ] Public share URL is **`/d/[slug]`** (not `/a/[slug]`).
- [ ] Nothing reads "AI-slop": no purple gradients, no glow, no decorative emoji-icons (mood-scale faces excepted), no rainbow charts, no centered gradient-blob hero.
