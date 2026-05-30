"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatInputProps = {
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function ChatInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Pídele un cambio...",
  disabled = false,
  className,
}: ChatInputProps) {
  const [internal, setInternal] = useState("");
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  function setValue(next: string) {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }

  function submit() {
    const trimmed = current.trim();
    if (!trimmed || disabled) return;
    onSubmit?.(trimmed);
    if (!isControlled) setInternal("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  const hasContent = current.trim().length > 0;

  return (
    <div className={cn("border-t border-border bg-background px-8 py-4", className)}>
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-3 rounded-xl border border-border bg-card p-3 shadow-sm focus-within:ring-2 focus-within:ring-ring"
      >
        <Sparkles className="mt-1.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <textarea
          aria-label="Pídele un cambio"
          rows={1}
          value={current}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
          placeholder={placeholder}
        />
        <button
          type="submit"
          aria-label="Enviar"
          disabled={!hasContent || disabled}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
            hasContent && !disabled
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        La IA puede cometer errores. Revisa siempre la información.
      </p>
    </div>
  );
}
