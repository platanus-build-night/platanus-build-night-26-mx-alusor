/**
 * Presentational types for the "Mis herramientas" surface.
 * These components are dumb/props-driven; real data wiring lives elsewhere.
 */

export type ToolStatus = "activa" | "borrador" | "archivada";

export type ToolIcon = "brain" | "apple" | "dumbbell" | "moon" | "pain" | "check";

/** Per-domain accent, mapped to our sober token vocabulary. */
export type ToolAccent = "sage" | "amber" | "blue" | "terracotta" | "teal";

export type PatientTool = {
  id: string;
  title: string;
  subtitle: string;
  editedAgo: string;
  status: ToolStatus;
  icon: ToolIcon;
  accent: ToolAccent;
  preview: {
    title: string;
    fields: Array<{ label: string; value: string }>;
    /** Header tint for the mini-preview (per-domain accent hex). */
    color: string;
  };
};
