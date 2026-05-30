import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "success" | "draft" | "muted" | "danger";

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

const tones: Record<BadgeTone, string> = {
  success: "bg-accent text-accent-foreground",
  draft: "bg-chart-3/20 text-chart-3",
  muted: "bg-muted text-muted-foreground",
  danger: "bg-destructive/15 text-destructive",
};

export function Badge({ children, tone = "muted", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
