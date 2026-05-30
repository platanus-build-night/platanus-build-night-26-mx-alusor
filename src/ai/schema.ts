import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The intermediate schema is defined as a JSON Schema in
// spec/intermediate-schema.schema.json (the boundary object between Opus and
// Sonnet). Loaded here as the single source of truth.

let _schema: Record<string, unknown> | undefined;

export function intermediateJsonSchema(): Record<string, unknown> {
  if (!_schema) {
    const raw = readFileSync(
      join(process.cwd(), "spec", "intermediate-schema.schema.json"),
      "utf8",
    );
    _schema = JSON.parse(raw) as Record<string, unknown>;
  }
  return _schema;
}

// TODO(validation): wire a real validator (ajv, or a zod mirror) for the
// schema.json the Opus parse turn writes, before showing the schema card.
// For now this is a structural sanity check only.
export function looksLikeSchemaInstance(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.meta === "object" && Array.isArray(v.fields);
}
