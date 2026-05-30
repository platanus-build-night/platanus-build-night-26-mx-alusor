import { cn } from "@/lib/utils";

type ProgressBarProps = {
  value: number;
  className?: string;
  indicatorClassName?: string;
};

export function ProgressBar({
  value,
  className,
  indicatorClassName,
}: ProgressBarProps) {
  return (
    <div
      className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full bg-primary transition-[width]", indicatorClassName)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
