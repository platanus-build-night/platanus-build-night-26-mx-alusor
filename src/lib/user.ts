import { currentUser } from "@clerk/nextjs/server";
import type { User } from "./types";

// ── AUTH SEAM (Clerk) ─────────────────────────────────────────────────
// Auth is handled by Clerk (see src/proxy.ts). The studio routes (/panel,
// /builder) and the build APIs are gated there, so in those contexts a real
// signed-in user is guaranteed. The /api/webhooks/anthropic route and the
// public surfaces (/, /d/[slug]) stay UNAUTHENTICATED and never call this in a
// way that needs identity. DEV_USER remains as a safe fallback so any
// not-yet-gated path keeps working rather than throwing.

export const DEV_USER: User = {
  id: "dev-user",
  name: "Dev User",
  email: "dev@doctoapp.local",
};

export async function getCurrentUser(): Promise<User> {
  // Dev without Clerk keys → fall back to the dev user (no throw from the SDK).
  if (!process.env.CLERK_SECRET_KEY) return DEV_USER;
  const clerk = await currentUser().catch(() => null);
  if (!clerk) return DEV_USER; // proxy.ts already gates; defensive fallback
  return {
    id: clerk.id,
    name:
      clerk.fullName ??
      clerk.firstName ??
      clerk.username ??
      clerk.primaryEmailAddress?.emailAddress ??
      "Usuario",
    email: clerk.primaryEmailAddress?.emailAddress ?? "",
  };
}
