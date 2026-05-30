"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Link2,
  Sparkles,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTENSIONS = [".docx", ".doc"];
const MAX_SIZE_MB = 25;

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type UploadPanelProps = {
  /** Wired by the spine: receives the validated .docx File when the user continues. */
  onUpload?: (file: File) => void | Promise<void>;
  /** Optional callback fired as soon as a valid file is selected (before continue). */
  onFile?: (file: File | null) => void;
  /** When true, shows the loading state on the continue button. */
  isUploading?: boolean;
  /** Optional externally-controlled error message (e.g. from a failed upload). */
  error?: string | null;
};

export function UploadPanel({
  onUpload,
  onFile,
  isUploading = false,
  error: externalError = null,
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const error = externalError ?? localError;

  function handleFiles(files: FileList | null) {
    const next = files?.[0];
    if (!next) return;

    if (!isAcceptedFile(next)) {
      setLocalError("Formato no admitido. Sube un archivo .docx o .doc.");
      setFile(null);
      onFile?.(null);
      return;
    }
    if (next.size > MAX_SIZE_MB * 1024 * 1024) {
      setLocalError(`El archivo supera el máximo de ${MAX_SIZE_MB} MB.`);
      setFile(null);
      onFile?.(null);
      return;
    }

    setLocalError(null);
    setFile(next);
    onFile?.(next);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFiles(event.target.files);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  function clearFile() {
    setFile(null);
    setLocalError(null);
    onFile?.(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleContinue() {
    if (!file) return;
    setLocalError(null);
    void onUpload?.(file);
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-y-auto px-6 py-10 lg:px-12">
      <div className="mx-auto w-full max-w-xl">
        <div className="text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Comienza creando tu app del paciente
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Sube tu formato de Word y la IA detectará los campos y construirá la
            app por ti.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
          className="hidden"
          onChange={handleInputChange}
        />

        {file ? (
          <SelectedFile
            name={file.name}
            size={formatSize(file.size)}
            error={error}
            onRemove={clearFile}
            onContinue={handleContinue}
            isContinuing={isUploading}
          />
        ) : (
          <Dropzone
            isDragging={isDragging}
            error={error}
            onBrowse={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          />
        )}

        <div className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Tu documento se analizará automáticamente
          </div>
        </div>

        <Steps />
      </div>
    </section>
  );
}

type DropzoneProps = {
  isDragging: boolean;
  error: string | null;
  onBrowse: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
};

function Dropzone({
  isDragging,
  error,
  onBrowse,
  onDragOver,
  onDragLeave,
  onDrop,
}: DropzoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "mt-8 rounded-xl border-2 border-dashed bg-background px-8 py-12 text-center transition",
        isDragging
          ? "border-primary bg-accent"
          : "border-border hover:border-primary/50",
      )}
    >
      <WordIcon />
      <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">
        Carga tu formato de Word
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Para comenzar a construir la app del paciente, arrastra un archivo .docx
        o selecciónalo desde tu equipo.
      </p>
      <button
        type="button"
        onClick={onBrowse}
        className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
      >
        <Upload className="h-4 w-4" />
        Seleccionar archivo
      </button>
      <p className="mt-4 text-xs text-muted-foreground">
        .docx · máx. {MAX_SIZE_MB} MB
      </p>
      {error ? (
        <p className="mt-3 text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

type SelectedFileProps = {
  name: string;
  size: string;
  error: string | null;
  onRemove: () => void;
  onContinue: () => void;
  isContinuing: boolean;
};

function SelectedFile({
  name,
  size,
  error,
  onRemove,
  onContinue,
  isContinuing,
}: SelectedFileProps) {
  return (
    <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="bg-accent text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
          <WordGlyph className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            Archivo listo · {size}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Quitar archivo"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={onContinue}
        disabled={isContinuing}
        className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isContinuing ? "Cargando documento..." : "Continuar al builder"}
        {!isContinuing ? <ArrowRight className="h-4 w-4" /> : null}
      </button>
      {error ? (
        <p className="mt-3 text-center text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Steps() {
  const steps = [
    {
      icon: Wand2,
      title: "1. Detectamos campos",
      description: "La IA identifica los campos clave de tu documento.",
    },
    {
      icon: Sparkles,
      title: "2. Ajustas con IA",
      description: "Revisa y ajusta los campos con ayuda de la IA.",
    },
    {
      icon: Link2,
      title: "3. Compartes el link",
      description: "Generamos tu app y un link listo para tus pacientes.",
    },
  ];

  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-3">
      {steps.map(({ icon: Icon, title, description }) => (
        <div key={title} className="text-center">
          <div className="bg-accent text-primary mx-auto flex h-10 w-10 items-center justify-center rounded-lg">
            <Icon className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      ))}
    </div>
  );
}

function WordIcon() {
  return (
    <div className="relative mx-auto h-20 w-16">
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-border bg-card text-primary shadow-sm">
        <WordGlyph className="h-8 w-8" />
      </div>
      <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
        <Upload className="h-4 w-4" />
      </div>
    </div>
  );
}

function WordGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 2.5L17.5 8H14V4.5ZM8.2 12h1.3l.9 4.1.95-4.1h1.3l.95 4.1.9-4.1h1.3l-1.45 6h-1.45l-.9-3.85L11.1 18H9.65L8.2 12Z" />
    </svg>
  );
}
