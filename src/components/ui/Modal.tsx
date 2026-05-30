"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

/** Minimal accessible modal: role=dialog, ESC + backdrop close, scroll-lock.
 *  (Hack-grade; swap for shadcn Dialog/Radix later for full focus-trap.) */
export function Modal({ open, title, onClose, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-lg",
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border px-8 pb-4 pt-6">
            <h2 className="font-display text-xl font-medium tracking-tight">
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
