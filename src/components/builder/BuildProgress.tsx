import { LoaderCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";

type BuildProgressProps = {
  /** Short status title for the current build phase, e.g. "Construyendo UI". */
  phase: string;
  /** Supporting line under the phase, e.g. "Generando la vista del paciente…". */
  label: string;
  /** 0–100 completion. When omitted, the bar renders as indeterminate. */
  percent?: number;
  className?: string;
};

export function BuildProgress({
  phase,
  label,
  percent,
  className,
}: BuildProgressProps) {
  const isDeterminate = typeof percent === "number";
  const clamped = isDeterminate
    ? Math.min(100, Math.max(0, percent as number))
    : undefined;

  return (
    <Card className={cn("rounded-xl p-4", className)}>
      <div className="flex items-center gap-4">
        <LoaderCircle className="h-9 w-9 shrink-0 animate-spin text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold">{phase}</p>
            {isDeterminate ? (
              <p className="text-sm font-semibold text-primary">{clamped}%</p>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          {isDeterminate ? (
            <ProgressBar
              value={clamped as number}
              className="mt-3 h-1.5"
              indicatorClassName="bg-primary"
            />
          ) : (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
