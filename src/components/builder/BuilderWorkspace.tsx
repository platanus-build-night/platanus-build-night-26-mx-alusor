"use client";

import { useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import type { DocToAppMessage } from "@/ai/messages";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { UploadPanel } from "@/components/upload/UploadPanel";
import { ChatInput } from "@/components/builder/ChatInput";
import { FileCard } from "@/components/builder/FileCard";
import { MarkdownMessage } from "@/components/builder/MarkdownMessage";
import { BuildProgress } from "@/components/builder/BuildProgress";
import { SchemaCard, type SchemaInstance } from "@/components/builder/SchemaCard";
import { QuestionCard } from "@/components/builder/QuestionCard";
import { PreviewPanel } from "@/components/builder/PreviewPanel";

const TOOL_ES: Record<string, string> = {
  read: "Leyendo el documento",
  bash: "Revisando el resultado",
  write: "Escribiendo la app",
  edit: "Ajustando detalles",
  glob: "Explorando archivos",
  grep: "Buscando en el contenido",
  web_fetch: "Consultando la web",
  web_search: "Buscando en la web",
};

/** "building: bash" → "Revisando el resultado" */
function friendlyStatus(s: string): string {
  const tool = s.split(":").pop()?.trim();
  if (!tool) return "";
  return TOOL_ES[tool] ?? `Trabajando (${tool})`;
}

export function BuilderWorkspace() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<SchemaInstance | null>(null);
  const [agentStatus, setAgentStatus] = useState("");
  const [buildingStarted, setBuildingStarted] = useState(false);

  // refs so the (stable) transport closure always reads the current values
  const sessionIdRef = useRef<string | null>(null);
  const schemaRef = useRef<SchemaInstance | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<DocToAppMessage>({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, body }) => {
          const phase = (body as Record<string, unknown> | undefined)?.phase ?? "clarify";
          const sid = sessionIdRef.current;
          if (phase === "parse") return { api: "/api/parse", body: { sessionId: sid } };
          if (phase === "build")
            return {
              api: "/api/build",
              body: {
                sessionId: sid,
                confirmedSchema:
                  (body as Record<string, unknown>)?.confirmedSchema ?? schemaRef.current,
              },
            };
          if (phase === "refine")
            return {
              api: "/api/refine",
              body: {
                sessionId: sid,
                slug: (body as Record<string, unknown>)?.slug,
                instruction: (body as Record<string, unknown>)?.instruction,
              },
            };
          return { api: "/api/chat", body: { messages, sessionId: sid, schema: schemaRef.current } };
        },
      }),
    [],
  );

  const { messages, sendMessage, addToolOutput, status } = useChat<DocToAppMessage>({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onData: (part) => {
      if (part.type === "data-agent-status") {
        const d = part.data as { phase?: string; detail?: string };
        setAgentStatus(d?.detail ? `${d.phase}: ${d.detail}` : d?.phase ?? "");
      }
    },
  });

  // derive the latest schema + the built artifact from the message stream
  let latestSchema: SchemaInstance | undefined;
  let artifactHtml: string | undefined;
  let artifactSlug: string | undefined;
  for (const m of messages) {
    for (const p of m.parts) {
      if (p.type === "data-schema") latestSchema = p.data as SchemaInstance;
      if (p.type === "data-artifact") {
        const d = p.data as { html?: string; slug?: string };
        artifactHtml = d.html;
        artifactSlug = d.slug;
      }
    }
  }

  const shownSchema = draft ?? latestSchema ?? null;
  schemaRef.current = shownSchema;

  const busy = status === "submitted" || status === "streaming";
  const built = !!artifactHtml;

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    setFilename(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Falló la subida.");
      }
      const { sessionId: sid } = (await res.json()) as { sessionId: string };
      setSessionId(sid);
      sessionIdRef.current = sid;
      sendMessage({ text: `Subí ${file.name}. Analízalo.` }, { body: { phase: "parse", sessionId: sid } });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Error al subir.");
    } finally {
      setUploading(false);
    }
  }

  function handleConfirm() {
    setBuildingStarted(true);
    setAgentStatus("");
    sendMessage(
      { text: "Confirmo el esquema — construye la app." },
      { body: { phase: "build", confirmedSchema: shownSchema } },
    );
  }

  function handleClarify(text: string) {
    if (text.trim()) sendMessage({ text }, { body: { phase: "clarify" } });
  }

  function handleRefine(text: string) {
    if (text.trim() && artifactSlug)
      sendMessage(
        { text },
        { body: { phase: "refine", slug: artifactSlug, instruction: text } },
      );
  }

  const previewStatus = built
    ? undefined
    : buildingStarted
      ? friendlyStatus(agentStatus) || "Construyendo…"
      : busy && !shownSchema
        ? friendlyStatus(agentStatus) || "Analizando documento…"
        : undefined;

  // ── Upload entry (no session yet) ──
  if (!sessionId) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Header />
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-10">
          <h1 className="mb-2 font-display text-3xl font-medium tracking-tight">Nueva herramienta</h1>
          <p className="mb-6 text-muted-foreground">
            Sube el formato de Word que le das a tus pacientes y lo convertimos en una mini-app.
          </p>
          <UploadPanel onUpload={handleUpload} isUploading={uploading} error={uploadError} />
        </div>
      </div>
    );
  }

  // ── Split-view builder ──
  return (
    <div className="flex h-dvh flex-col">
      <Header />
      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(420px,0.9fr)_minmax(480px,1fr)]">
        {/* LEFT: chat */}
        <div className="flex flex-col overflow-hidden border-r border-border">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {filename && <FileCard fileName={filename} fileType="Microsoft Word" status="ready" />}

            {messages.map((m) => (
              <div key={m.id} className="space-y-3">
                {m.parts.map((part, i) => {
                  if (part.type === "text") {
                    return m.role === "user" ? (
                      <div key={i} className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                          {part.text}
                        </div>
                      </div>
                    ) : (
                      <MarkdownMessage key={i}>{part.text}</MarkdownMessage>
                    );
                  }
                  if (part.type === "tool-askQuestion") {
                    const p = part as unknown as {
                      state: string;
                      toolCallId: string;
                      input?: { question?: string; kind?: "choice" | "text" | "scale"; options?: string[] };
                      output?: unknown;
                    };
                    return (
                      <QuestionCard
                        key={i}
                        question={p.input?.question ?? ""}
                        kind={p.input?.kind ?? "choice"}
                        options={p.input?.options}
                        answered={p.state === "output-available"}
                        answer={p.state === "output-available" ? String(p.output ?? "") : undefined}
                        onAnswer={(value) =>
                          addToolOutput({ tool: "askQuestion", toolCallId: p.toolCallId, output: value })
                        }
                      />
                    );
                  }
                  return null;
                })}
              </div>
            ))}

            {/* editable schema card */}
            {shownSchema && !built && (
              <SchemaCard schema={shownSchema} onChange={setDraft} onConfirm={handleConfirm} busy={busy} />
            )}

            {busy &&
              (!shownSchema ? (
                <BuildProgress
                  phase="Analizando tu documento"
                  label={friendlyStatus(agentStatus) || "Leyendo el documento con la skill de Word…"}
                />
              ) : built ? (
                <BuildProgress
                  phase="Aplicando tu cambio"
                  label={friendlyStatus(agentStatus) || "Editando la mini-app…"}
                />
              ) : buildingStarted ? (
                <BuildProgress
                  phase="Construyendo tu app"
                  label={friendlyStatus(agentStatus) || "Generando la mini-app del paciente…"}
                />
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
                  Escribiendo…
                </p>
              ))}
            {built && !busy && (
              <p className="text-sm text-primary">
                ✅ Lista — mírala a la derecha (o ábrela en pantalla completa). Pídele un cambio abajo. 🔁
              </p>
            )}
          </div>

          {/* composer — clarify (before build) or refine (after build) */}
          {(shownSchema || built) && (
            <ChatInput
              onSubmit={built ? handleRefine : handleClarify}
              disabled={busy}
              placeholder={
                built
                  ? "Pídele un cambio: «haz la escala de 0 a 10», «ponlo en azul»…"
                  : "Pídele un ajuste o responde una duda…"
              }
            />
          )}
        </div>

        {/* RIGHT: preview */}
        <PreviewPanel html={artifactHtml} slug={artifactSlug} statusLabel={previewStatus} />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border px-5 py-3">
      <Logo />
      <Avatar initials="E" label="edd" />
    </header>
  );
}
