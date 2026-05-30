# DocToApp — Setup

What's **manual** (one-time, external accounts/secrets) vs **automated** (in code).
Copy `.env.example` → `.env.local` and fill in as you go. Auth is **deferred** (dev runs as a hardcoded dev user).

## 🔧 Manual (you, one-time)

### 1. Anthropic API key — **needed now**
- platform.claude.com → Settings → Keys → create.
- `ANTHROPIC_API_KEY=sk-ant-...`
- Managed Agents beta is **enabled by default** on all API accounts — no request needed.

### 2. MongoDB Atlas — **needed for persistence (phase 3)**
- Use a **separate cluster/db** from prod. Create a DB user + add your IP (or `0.0.0.0/0` for the hack) to Network Access.
- `MONGODB_URI="mongodb+srv://USER:PASS@CLUSTER.mongodb.net/?retryWrites=true&w=majority"`
- DB name defaults to `doctoapp`. Driver pinned to **mongodb@6** (Auth.js adapter peers `^6`).

### 3. Vercel Blob — **needed for storage (phase 3)**
- Create a Blob store in the Vercel dashboard (or `vercel link`).
- Local token: `vercel env pull` → `BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...`

### 4. Webhook signing key — **only for DEPLOY**
- Console → Manage → Webhooks → new endpoint `https://<host>/api/webhooks/anthropic`, subscribe to `session.status_idled` + `session.status_terminated`.
- `ANTHROPIC_WEBHOOK_SIGNING_KEY=whsec_...` (shown once).
- **Dev doesn't need this** (synchronous re-tail path). To test locally, expose via `ngrok` (Console requires a public HTTPS:443 host).

### 5. Google OAuth — **DEFERRED**
- Skip for now. When wiring Auth.js v5: create an OAuth client, set `AUTH_GOOGLE_ID/SECRET` + `AUTH_SECRET` (`npx auth secret`), and `npm i next-auth@beta @auth/mongodb-adapter@3`.

## 🤖 Automated (in code, you don't touch)
- The **Managed Agent** (model + system prompt + docx/pdf skills) and **cloud environment** are created/reused at runtime (create-or-reuse), or via a setup script later. Prompts live in `spec/prompts/`.
- Sessions, file upload/mount, event streaming, artifact retrieval, Mongo writes, Blob publishing.

## ▶️ Run
```bash
cp .env.example .env.local   # fill ANTHROPIC_API_KEY at minimum
npm run dev                  # http://localhost:3000
```
The build runs **async on Anthropic** — plan-agnostic, works on Vercel Hobby (no `maxDuration` bump needed for the build itself).

See `spec/README.md` for the agent contracts and `.claude/skills/` for the build skills.
