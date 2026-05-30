import { Monitor, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PhoneFrame } from "@/components/ui/PhoneFrame";

/**
 * Inert "Vista del paciente" placeholder shown next to the upload panel before
 * a document exists. Purely presentational: the live preview is wired later.
 */
export function UploadPreviewPanel() {
  return (
    <section className="hidden min-w-0 flex-1 flex-col bg-muted lg:flex">
      <div className="flex h-16 items-center justify-between border-b border-border bg-background px-8">
        <h2 className="font-display text-2xl font-semibold text-muted-foreground/60">
          Vista del paciente
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex rounded-lg border border-border bg-muted p-1 opacity-60">
            <span className="flex h-9 w-10 items-center justify-center rounded-md bg-background text-muted-foreground shadow-sm">
              <Smartphone className="h-4 w-4" />
            </span>
            <span className="flex h-9 w-10 items-center justify-center rounded-md text-muted-foreground">
              <Monitor className="h-4 w-4" />
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Refrescar vista previa"
            disabled
            className="opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <PhoneFrame className="opacity-70" screenClassName="bg-muted">
          <SkeletonScreen />
        </PhoneFrame>
      </div>
    </section>
  );
}

function SkeletonScreen() {
  return (
    <div className="flex h-full flex-col gap-4 px-6 pt-12">
      <div className="mx-auto h-16 w-16 rounded-xl bg-muted" />
      <div className="mx-auto h-4 w-40 rounded-full bg-muted" />
      <div className="mt-4 h-12 w-full rounded-lg bg-muted/70" />
      <div className="h-12 w-full rounded-lg bg-muted/70" />
      <div className="flex items-center gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className="h-6 w-6 rounded-full border-2 border-border/80"
          />
        ))}
      </div>
      <div className="mt-3 h-12 w-full rounded-lg bg-muted/70" />
      <div className="h-12 w-full rounded-lg bg-muted/70" />
      <div className="mt-auto mb-10 h-12 w-full rounded-lg bg-muted" />
    </div>
  );
}
