"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import type { PatientTool } from "./types";
import { ShareModal } from "./ShareModal";
import { ToolCard } from "./ToolCard";

type ToolsGridProps = {
  tools: PatientTool[];
};

export function ToolsGrid({ tools }: ToolsGridProps) {
  const [selectedTool, setSelectedTool] = useState<PatientTool | null>(null);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl font-semibold tracking-tight">
            Mis herramientas
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Crea, abre y comparte apps clínicas generadas desde documentos.
          </p>
        </div>
        <Link
          href="/builder"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nueva herramienta
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} onShare={setSelectedTool} />
        ))}
      </div>

      <ShareModal
        tool={selectedTool}
        open={selectedTool !== null}
        onClose={() => setSelectedTool(null)}
      />
    </div>
  );
}
