import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Leaf className="h-4 w-4" />
      </div>
      <span className="font-display text-2xl font-semibold tracking-tight">
        DocToApp
      </span>
    </div>
  );
}
