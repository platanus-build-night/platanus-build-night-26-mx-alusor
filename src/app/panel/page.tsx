import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { listProjects } from "@/lib/projects";
import { getCurrentUser } from "@/lib/user";
import { Logo } from "@/components/ui/Logo";
import { ToolsGrid } from "@/components/tools/ToolsGrid";
import type { PatientTool, ToolAccent, ToolIcon } from "@/components/tools/types";

// Reads Mongo per request → must be dynamic (not prerendered at build time).
export const dynamic = "force-dynamic";

const ACCENT_HEX: Record<ToolAccent, string> = {
  sage: "#3f7d72",
  amber: "#b88a3e",
  blue: "#5b7fa6",
  terracotta: "#b5654a",
  teal: "#3f8a85",
};
const ACCENTS: ToolAccent[] = ["sage", "amber", "blue", "terracotta", "teal"];
const ARCHETYPE_SUB: Record<string, string> = {
  tracker_recurrente: "Seguimiento recurrente",
  autoevaluacion_resultado: "Autoevaluación con resultado",
  formulario_unico: "Formulario único",
};

function iconFor(profession?: string): ToolIcon {
  if (profession === "psicologia") return "brain";
  if (profession === "nutricion") return "apple";
  if (profession === "fisio") return "dumbbell";
  return "check";
}

function timeAgo(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d;
  const mins = Math.floor((Date.now() - t.getTime()) / 60000);
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export default async function Panel() {
  const user = await getCurrentUser();
  const projects = await listProjects(user.id).catch(() => []);

  const tools: PatientTool[] = projects.map((p) => {
    const schema = (p.schema ?? {}) as {
      meta?: { profession?: string };
      fields?: Array<{ label?: string }>;
    };
    const accent: ToolAccent = ACCENTS.includes(p.themeAccent as ToolAccent)
      ? (p.themeAccent as ToolAccent)
      : "sage";
    const fields = (schema.fields ?? [])
      .slice(0, 3)
      .map((f) => ({ label: f.label ?? "Campo", value: "" }));
    return {
      id: p.slug,
      title: p.title,
      subtitle: ARCHETYPE_SUB[p.archetype ?? ""] ?? "Herramienta",
      editedAgo: `Editada ${timeAgo(p.updatedAt)}`,
      status: "activa",
      icon: iconFor(schema.meta?.profession),
      accent,
      preview: { title: p.title, fields, color: ACCENT_HEX[accent] },
    };
  });

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <Link href="/" aria-label="Ir al inicio">
          <Logo />
        </Link>
        <UserButton />
      </header>
      <main className="px-6 py-10">
        <ToolsGrid tools={tools} />
      </main>
    </div>
  );
}
