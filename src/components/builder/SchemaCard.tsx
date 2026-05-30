"use client";

import { GripVertical, Trash2, Sparkles, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const FIELD_TYPES = [
  "text", "textarea", "number", "scale", "select",
  "multiselect", "boolean", "date", "time", "rating",
] as const;

const TYPE_LABEL: Record<string, string> = {
  text: "Texto", textarea: "Texto largo", number: "Número", scale: "Escala",
  select: "Selección", multiselect: "Selección múltiple", boolean: "Sí/No",
  date: "Fecha", time: "Hora", rating: "Rating",
};

const ARCHETYPE_LABEL: Record<string, string> = {
  tracker_recurrente: "Seguimiento recurrente",
  autoevaluacion_resultado: "Autoevaluación con resultado",
  formulario_unico: "Formulario único",
};

export type SchemaField = {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  [k: string]: unknown;
};

export type SchemaInstance = {
  meta?: {
    title?: string;
    archetype?: string;
    theme?: { accent?: string };
    intro?: string;
    profession?: string;
  };
  fields?: SchemaField[];
  scoring?: { bands?: Array<{ label?: string }>; disclaimer?: string } | null;
  parserNotes?: Array<{ sourceStructure?: string; issue?: string; proposedRepresentation?: string }>;
  views?: Record<string, unknown>;
  [k: string]: unknown;
};

export function SchemaCard({
  schema,
  onChange,
  onConfirm,
  busy,
}: {
  schema: SchemaInstance;
  onChange: (next: SchemaInstance) => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const fields = schema.fields ?? [];

  const setField = (i: number, patch: Partial<SchemaField>) =>
    onChange({
      ...schema,
      fields: fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)),
    });

  const removeField = (i: number) =>
    onChange({ ...schema, fields: fields.filter((_, idx) => idx !== i) });

  return (
    <Card className="w-full overflow-hidden p-0">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Esquema detectado
            </span>
          </div>
          <input
            value={schema.meta?.title ?? ""}
            onChange={(e) =>
              onChange({ ...schema, meta: { ...schema.meta, title: e.target.value } })
            }
            className="w-full bg-transparent font-display text-lg font-medium tracking-tight outline-none"
            aria-label="Título"
          />
        </div>
        {schema.meta?.archetype && (
          <Badge tone="muted">
            {ARCHETYPE_LABEL[schema.meta.archetype] ?? schema.meta.archetype}
          </Badge>
        )}
      </div>

      <ul className="divide-y divide-border">
        {fields.map((f, i) => (
          <li key={f.id ?? i} className="flex items-center gap-2 px-5 py-2.5">
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
            <input
              value={f.label ?? ""}
              onChange={(e) => setField(i, { label: e.target.value })}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              aria-label="Etiqueta del campo"
            />
            <select
              value={f.type}
              onChange={(e) => setField(i, { type: e.target.value })}
              className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
              aria-label="Tipo de campo"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
            <button
              onClick={() => removeField(i)}
              aria-label="Quitar campo"
              className="shrink-0 rounded-md p-1 text-muted-foreground/60 hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      {schema.scoring && (
        <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          Calcula un puntaje · {schema.scoring.bands?.length ?? 0} bandas · con aviso de no-diagnóstico.
        </div>
      )}

      {(schema.parserNotes?.length ?? 0) > 0 && (
        <div className="space-y-1.5 border-t border-border bg-muted/40 px-5 py-3">
          {schema.parserNotes!.map((n, i) => (
            <p key={i} className="flex gap-2 text-xs text-muted-foreground">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-chart-3" />
              <span>
                <b className="font-medium text-foreground">{n.sourceStructure}</b>
                {n.proposedRepresentation ? ` → ${n.proposedRepresentation}` : ""}
              </span>
            </p>
          ))}
        </div>
      )}

      <div className="border-t border-border px-5 py-3">
        <Button onClick={onConfirm} disabled={busy} className="w-full">
          {busy ? "Construyendo…" : "Confirmar y construir"}
        </Button>
      </div>
    </Card>
  );
}
