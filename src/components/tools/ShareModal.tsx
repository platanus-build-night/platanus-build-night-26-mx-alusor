"use client";

import { Copy, ExternalLink, Link2, Quote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { PatientTool } from "./types";

type ShareModalProps = {
  tool: PatientTool | null;
  open: boolean;
  onClose: () => void;
};

function QrPlaceholder() {
  const cells = [
    0, 1, 2, 5, 6, 7, 10, 11, 13, 15, 18, 20, 22, 24, 26, 29, 30, 33, 35, 36,
    38, 41, 43, 45, 47, 49, 52, 54, 56, 57, 58, 61, 63,
  ];

  return (
    <div className="grid h-28 w-28 grid-cols-8 gap-1 rounded-lg border border-border bg-card p-2">
      {Array.from({ length: 64 }).map((_, index) => (
        <span
          key={index}
          className={cells.includes(index) ? "rounded-sm bg-foreground" : ""}
        />
      ))}
    </div>
  );
}

export function ShareModal({ tool, open, onClose }: ShareModalProps) {
  const slug = tool?.id ?? "herramienta";
  const link = `doctoapp.app/d/${slug}`;

  return (
    <Modal open={open} title="Compartir herramienta" onClose={onClose}>
      <div className="px-8 pb-7 pt-1">
        <p className="text-sm font-medium text-muted-foreground">{tool?.title}</p>

        <div className="mt-6">
          <label className="text-sm font-semibold">Link para paciente</label>
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
            <Link2 className="h-4 w-4 text-primary" />
            <span className="flex-1">{link}</span>
            <Copy className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold">Código QR</p>
          <div className="mt-3 flex items-center gap-6">
            <QrPlaceholder />
            <Button variant="outline">
              <ExternalLink className="h-4 w-4" />
              Abrir como paciente
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold">Mensaje sugerido</p>
          <div className="mt-2 flex gap-3 rounded-lg border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
            <Quote className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <p>
              Hola, completa este diario después de tu sesión. Tus respuestas
              ayudan a revisar tu progreso.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 border-t border-border bg-muted px-8 py-5">
        <Button variant="outline" className="min-w-36" onClick={onClose}>
          Cancelar
        </Button>
        <Button className="min-w-40">
          <Copy className="h-4 w-4" />
          Copiar link
        </Button>
      </div>
    </Modal>
  );
}
