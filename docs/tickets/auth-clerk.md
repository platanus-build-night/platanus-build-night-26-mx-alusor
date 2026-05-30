# Ticket: Integrar Clerk para gatear el uso de tokens

**Estado:** ✅ HECHO (2026-05-30) · **Tipo:** auth (cierra la fase 4 "auth deferred" del plan)
**Creado:** 2026-05-30

> **Implementado** vía Clerk CLI (`clerk init`), `@clerk/nextjs@^7.4.2`. Archivos: `src/proxy.ts` (fail-closed, allow-list pública), `src/app/layout.tsx` (`<ClerkProvider afterSignOutUrl="/">`), `src/app/sign-in|sign-up/[[...]]/page.tsx` (`fallbackRedirectUrl="/panel"`), `src/lib/user.ts` (Clerk `currentUser()` + fallback `DEV_USER` si no hay `CLERK_SECRET_KEY`), `<UserButton/>` en el header de `/panel`. Env en `.env.local` (dev) + `render.yaml`/`.env.example`.
> **Caveat #8302 NO aplica** en 7.4.2: `auth.protect()` en `proxy.ts` redirige correctamente a `/sign-in?redirect_url=…` (verificado por curl).
> **Pendiente:** (a) confirmar atribución con login real en el navegador; (b) en Render: setear las 2 env vars + (Clerk dashboard) crear instancia de producción o añadir el dominio onrender.com.

## Objetivo

Poner detrás de un login **solo** las superficies que gastan tokens (el estudio + sus rutas de API) usando **Clerk**, sin romper el flujo público del paciente ni el webhook de Anthropic. El objetivo principal NO es gestión de usuarios sofisticada: es **blindar el gasto de la API key** para el hackathon.

### Por qué Clerk (y no Auth.js / Better Auth)

- **Free tier 50k MAU** (subió de 10k en 2026) — de sobra para el hack.
- **Cero trabajo de base de datos**: Clerk aloja los usuarios; no tocamos Mongo ni añadimos adapter/colecciones. `mongodb@6` se queda como está.
- **Drop-in en Next.js 16**: `clerkMiddleware()` funciona en el nuevo `proxy.ts` (mismo código, solo cambia el nombre del archivo) y trae UI prefabricada (`<SignIn/>`, `<UserButton/>`).
- ⚠️ **Auth.js / NextAuth quedó en modo solo-parches de seguridad** (sept-2025; su equipo se fusionó con Better Auth y recomienda Better Auth para proyectos nuevos). Además su patrón de middleware documentado es *pre*-rename de Next 16. Por eso descartamos el "ya tenemos NextAuth listo": hoy es el camino legacy. Better Auth sería la opción self-hosted correcta a largo plazo (datos en nuestro Mongo, sin techo de MAU) si más adelante Terapify quiere ser dueño de los usuarios — registrado como alternativa, no para este ticket.

## ⚠️ Mapa de gating (lo crítico — verificado contra las rutas reales del repo)

**🔒 GATEAR (estudio + consumo de tokens):**
- `src/app/panel/page.tsx` — dashboard (ya usa `getCurrentUser`)
- `src/app/builder/page.tsx` — el estudio
- `src/app/api/chat/route.ts` — orquestador Sonnet
- `src/app/api/parse/route.ts`
- `src/app/api/build/route.ts` — agente Opus (gasto fuerte; ya usa `getCurrentUser`)
- `src/app/api/refine/route.ts`
- `src/app/api/upload/route.ts`
- `src/app/api/build/[id]/status/route.ts` y `.../stream/route.ts` — los consume el estudio ya autenticado

**🌐 DEJAR PÚBLICO siempre (si se gatean, se rompe el MVP):**
- `src/app/route.ts` (`/`) — landing de marketing estática
- `src/app/d/[slug]/route.ts` (`/d/:slug`) — mini-apps del paciente, se llenan en el móvil **sin login**
- `src/app/api/webhooks/anthropic/route.ts` — **lo firma Anthropic, debe quedar SIN auth** (lo dice `CLAUDE.md` y el comentario en `src/lib/user.ts`)

> Estrategia **fail-closed**: en `proxy.ts` se protege *todo por defecto* y se permite explícitamente solo la allow-list pública. Así, si alguien añade una ruta de API nueva que gasta tokens, queda protegida automáticamente.

## Pasos de implementación

1. **Instalar** el SDK (confirmar versión compatible Next 16 / React 19 al momento de instalar):
   ```bash
   npm install @clerk/nextjs
   ```

2. **Crear la app en el dashboard de Clerk** → copiar las dos llaves. Habilitar los métodos de login deseados (email + Google basta).

3. **Env vars** — añadir a `.env.example` y a Render (Dashboard → Environment):
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
   CLERK_SECRET_KEY=sk_...
   # opcional si se usan páginas hospedadas en vez de catch-all locales:
   # NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   # NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   ```
   Y **borrar/actualizar** el bloque "DEFERRED: auth" de `.env.example` que aún menciona `AUTH_SECRET`/`AUTH_GOOGLE_*` (eran para Auth.js, ya no aplican).

4. **`<ClerkProvider>`** — envolver el `<body>` en `src/app/layout.tsx`. (La landing `/` se sirve por route handler fuera del layout, así que queda naturalmente pública — correcto.)

5. **`src/proxy.ts`** (nombre de Next 16, antes `middleware.ts`) — fail-closed con allow-list:
   ```ts
   import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

   // Todo protegido EXCEPTO esta allow-list pública.
   const isPublicRoute = createRouteMatcher([
     "/",                        // landing (app/route.ts)
     "/d(.*)",                   // mini-apps del paciente — público
     "/api/webhooks/anthropic",  // firmado por Anthropic — sin auth
     "/sign-in(.*)",
     "/sign-up(.*)",
   ]);

   export default clerkMiddleware(async (auth, req) => {
     if (!isPublicRoute(req)) await auth.protect();
   });

   export const config = {
     matcher: [
       "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|docx?)).*)",
       "/(api|trpc)(.*)",
     ],
   };
   ```

6. **Rewire del seam** en `src/lib/user.ts` (único punto que lee la identidad). Mantener un fallback a `DEV_USER` cuando no haya llaves, para que el dev local siga funcionando sin Clerk:
   ```ts
   import { currentUser } from "@clerk/nextjs/server";
   import type { User } from "./types";

   export const DEV_USER: User = { id: "dev-user", name: "Dev User", email: "dev@doctoapp.local" };

   export async function getCurrentUser(): Promise<User> {
     if (!process.env.CLERK_SECRET_KEY) return DEV_USER; // dev sin llaves
     const u = await currentUser();
     if (!u) return DEV_USER; // proxy.ts ya gatea; fallback defensivo
     return {
       id: u.id,
       name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "Usuario",
       email: u.primaryEmailAddress?.emailAddress ?? "",
     };
   }
   ```
   Actualizar también el comentario "wire Auth.js v5 later" de ese archivo → ahora es Clerk.

7. **Páginas de login** — elegir una:
   - **Mínimo esfuerzo:** usar el Account Portal hospedado de Clerk (cero páginas; solo las env URLs).
   - **Local:** catch-all `src/app/sign-in/[[...sign-in]]/page.tsx` con `<SignIn />` (y `sign-up` análogo).

8. **`<UserButton />`** en el header del estudio (`panel` y/o `builder`) para poder cerrar sesión.

9. **Actualizar `CLAUDE.md`** (sección Conventions → "Auth is DEFERRED"): reflejar que auth = Clerk, que `/d/[slug]` y `/api/webhooks/anthropic` siguen públicos, y que el webhook **debe** quedar sin gatear.

## Caveat conocido

- **clerk/javascript#8302**: `auth.protect()` dentro de `proxy.ts` (Next 16) puede redirigir a la URL actual en vez de a la pantalla de sign-in. Workaround: usar `auth.protect()` con redirect explícito o `redirectToSignIn()`. Revisar si ya está resuelto en la versión instalada.

## Criterios de aceptación

- [x] Sin sesión, visitar `/builder` o `/panel` → redirige a sign-in. *(307 → /sign-in?redirect_url=…)*
- [x] Sin sesión, `POST /api/chat|parse|build|refine|upload` → 401/redirect, **sin gastar tokens**. *(307, los 5)*
- [x] `/d/<slug>` carga **sin login** (flujo del paciente intacto). *(404 en slug inexistente = handler corrió, sin redirect)*
- [x] `POST /api/webhooks/anthropic` sin auth **no** redirige a sign-in (sigue llegando al handler). *(501 del stub)*
- [x] `/` (landing) carga sin sesión. *(200)*
- [~] Con sesión, `getCurrentUser()` devuelve el usuario real de Clerk y los builds quedan atribuidos a su `id`. *(código correcto; falta confirmar con login real en navegador)*
- [x] Dev local sin llaves de Clerk sigue funcionando (cae a `DEV_USER`). *(short-circuit por `CLERK_SECRET_KEY`)*
- [~] Deploy en Render con las 2 env vars; sin cambio de plan. *(render.yaml listo; pendiente setear vars + dominio en Clerk)*

## Notas

- Las versiones de Clerk/SDK se mueven rápido: validar los nombres de API (`clerkMiddleware`, `createRouteMatcher`, `currentUser`, `<ClerkProvider>`) contra la doc vigente al instalar. Los snippets de arriba son punto de partida.
- No hay cambios de base de datos: Clerk aloja los usuarios; Mongo solo guarda los proyectos/HTML como hoy.
