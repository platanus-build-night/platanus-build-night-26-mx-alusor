import { CheckCircle2, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type FileCardProps = {
  fileName: string;
  fileType?: string;
  size?: string;
  status?: "ready";
  className?: string;
};

export function FileCard({
  fileName,
  fileType,
  size,
  className,
}: FileCardProps) {
  const meta = [size, fileType].filter(Boolean).join(" · ");

  return (
    <Card className={cn("flex items-center gap-4 rounded-xl p-4", className)}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <FileText className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{fileName}</p>
        {meta ? (
          <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
        ) : null}
      </div>
      <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
    </Card>
  );
}
