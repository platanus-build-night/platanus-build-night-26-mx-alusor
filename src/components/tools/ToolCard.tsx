"use client";

import Link from "next/link";
import {
  Apple,
  Brain,
  CheckSquare,
  Dumbbell,
  ExternalLink,
  Moon,
  Share2,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { IconTile } from "@/components/ui/IconTile";
import type { PatientTool, ToolIcon } from "./types";
import { ToolMiniPreview } from "./ToolMiniPreview";

const icons: Record<ToolIcon, typeof Brain> = {
  brain: Brain,
  apple: Apple,
  dumbbell: Dumbbell,
  moon: Moon,
  pain: UserRound,
  check: CheckSquare,
};

type ToolCardProps = {
  tool: PatientTool;
  onShare: (tool: PatientTool) => void;
};

export function ToolCard({ tool, onShare }: ToolCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="relative flex h-52 items-end justify-center bg-muted px-5 pt-4">
        <IconTile
          icon={icons[tool.icon]}
          tone={tool.accent}
          className="absolute left-5 top-5"
        />
        <ToolMiniPreview tool={tool} />
      </div>
      <div className="border-t border-border p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display font-semibold">{tool.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tool.editedAgo}</p>
          </div>
          <Badge tone={tool.status === "borrador" ? "draft" : "success"}>
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
            {tool.status}
          </Badge>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
        <Link
          href="/builder"
          className="inline-flex items-center gap-2 font-medium text-primary"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir herramienta
        </Link>
        <button
          className="inline-flex items-center gap-2 font-medium text-muted-foreground transition hover:text-foreground"
          onClick={() => onShare(tool)}
        >
          <Share2 className="h-4 w-4" />
          Compartir
        </button>
      </div>
    </Card>
  );
}
