import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";

type IconTileTone = "sage" | "amber" | "blue" | "terracotta" | "teal";

type IconTileProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone?: IconTileTone;
  className?: string;
};

/**
 * Per-domain accent tints for the "Mis herramientas" cards / mini-app domains.
 * Routed through our calm oklch chart tokens (sage MH/nutrition, blue sleep,
 * terracotta pain, teal weekly, amber draft) so they stay low-chroma.
 */
const tones: Record<IconTileTone, string> = {
  sage: "bg-accent text-accent-foreground",
  amber: "bg-chart-3/20 text-chart-3",
  blue: "bg-chart-4/15 text-chart-4",
  terracotta: "bg-chart-2/15 text-chart-2",
  teal: "bg-primary/12 text-primary",
};

export function IconTile({ icon: Icon, tone = "sage", className }: IconTileProps) {
  return (
    <div
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-xl",
        tones[tone],
        className,
      )}
    >
      <Icon className="h-6 w-6" />
    </div>
  );
}
