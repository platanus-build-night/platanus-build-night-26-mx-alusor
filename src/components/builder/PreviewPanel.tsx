"use client";

import { Maximize2, Smartphone } from "lucide-react";
import { PhoneFrame } from "@/components/ui/PhoneFrame";

export function PreviewPanel({
  html,
  statusLabel,
  slug,
}: {
  html?: string;
  statusLabel?: string;
  slug?: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h2 className="font-display text-base font-medium">Vista del paciente</h2>
        <div className="flex items-center gap-3">
          {statusLabel ? (
            <span className="max-w-[200px] truncate text-xs text-muted-foreground">
              {statusLabel}
            </span>
          ) : null}
          {slug ? (
            <a
              href={`/d/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:border-primary hover:bg-accent"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Abrir
            </a>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto bg-muted/30 p-6">
        <PhoneFrame screenClassName="bg-background">
          {html ? (
            <iframe
              title="Vista del paciente"
              srcDoc={html}
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-forms allow-same-origin"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
              <Smartphone className="h-8 w-8 opacity-40" />
              <p className="text-sm">
                {statusLabel ?? "Aquí verás la mini-app cuando esté lista."}
              </p>
            </div>
          )}
        </PhoneFrame>
      </div>
    </div>
  );
}
