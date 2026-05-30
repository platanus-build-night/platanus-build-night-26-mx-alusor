// Shared domain types for DocToApp (studio side).

export type Archetype =
  | "tracker_recurrente"
  | "autoevaluacion_resultado"
  | "formulario_unico";

export interface User {
  id: string;
  name: string;
  email: string;
}

/**
 * Lifecycle of a build (the studio's view of one document → app job).
 * The Managed-Agent session itself lives on Anthropic; this is our mirror.
 */
export type BuildStatus =
  | "uploaded" // docx in Blob, no session yet
  | "parsing" // session created, parse turn running
  | "awaiting_input" // schema ready, clarify in progress
  | "building" // build turn running on Anthropic
  | "ready" // index.html published to Blob
  | "error";

/** The intermediate schema is validated against spec/intermediate-schema.schema.json.
 *  Kept loose here; the JSON Schema is the source of truth (see ai/schema.ts). */
export type IntermediateSchema = Record<string, unknown>;

/** Mongo `builds` collection document. Keyed/indexed by sessionId. */
export interface BuildDoc {
  userId: string; // DEV_USER.id for now (auth deferred)
  documentId: string;
  blobUrl: string; // uploaded .docx
  sessionId?: string; // Anthropic Managed-Agent session
  agentId?: string;
  archetype?: Archetype;
  schema?: IntermediateSchema;
  slug?: string; // public /d/[slug]
  artifactUrl?: string; // published index.html Blob URL
  status: BuildStatus;
  createdAt: Date;
  updatedAt: Date;
}
