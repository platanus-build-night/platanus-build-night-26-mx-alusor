import "server-only";
import { getDb } from "./mongodb";

// A "project" = one generated patient mini-app. The single-file HTML is small
// (<60KB) so we store it directly in Mongo — durable, no Blob/filesystem needed
// (filesystem is ephemeral on Render/Railway). /d/[slug] serves the html.

export type Project = {
  slug: string;
  userId: string;
  sessionId: string;
  title: string;
  archetype?: string;
  themeAccent?: string;
  schema: Record<string, unknown>;
  html: string;
  bytes: number;
  createdAt: Date;
  updatedAt: Date;
};

function slugify(s: string): string {
  const base = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "app";
}

export async function saveProject(input: {
  userId: string;
  sessionId: string;
  title: string;
  archetype?: string;
  themeAccent?: string;
  schema: Record<string, unknown>;
  html: string;
}): Promise<{ slug: string }> {
  const db = await getDb();
  const slug = `${slugify(input.title)}-${crypto.randomUUID().slice(0, 6)}`;
  const now = new Date();
  await db.collection<Project>("projects").insertOne({
    ...input,
    slug,
    bytes: input.html.length,
    createdAt: now,
    updatedAt: now,
  });
  return { slug };
}

/** Update the html of an existing project (for the refine loop). */
export async function updateProjectHtml(slug: string, html: string): Promise<void> {
  const db = await getDb();
  await db
    .collection<Project>("projects")
    .updateOne({ slug }, { $set: { html, bytes: html.length, updatedAt: new Date() } });
}

export async function getProjectHtml(slug: string): Promise<string | null> {
  const db = await getDb();
  const doc = await db.collection<Project>("projects").findOne({ slug });
  return doc?.html ?? null;
}

export async function listProjects(userId: string): Promise<Project[]> {
  const db = await getDb();
  return db
    .collection<Project>("projects")
    .find({ userId }, { projection: { html: 0 } }) // omit the big html field in lists
    .sort({ updatedAt: -1 })
    .limit(50)
    .toArray();
}
