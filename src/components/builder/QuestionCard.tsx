"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function QuestionCard({
  question,
  kind,
  options,
  onAnswer,
  answered,
  answer,
}: {
  question: string;
  kind: "choice" | "text" | "scale";
  options?: string[];
  onAnswer: (value: string) => void;
  answered?: boolean;
  answer?: string;
}) {
  const [text, setText] = useState("");

  return (
    <Card className="w-full p-4">
      <div className="mb-3 flex gap-2">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm">{question}</p>
      </div>

      {answered ? (
        <p className="text-xs text-muted-foreground">
          Respondido: <span className="text-foreground">{answer}</span>
        </p>
      ) : kind === "text" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) onAnswer(text.trim());
          }}
          className="flex gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tu respuesta…"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" size="sm">Enviar</Button>
        </form>
      ) : kind === "scale" ? (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              onClick={() => onAnswer(String(n))}
              className="h-9 min-w-9 rounded-md border border-border text-sm hover:border-primary hover:bg-accent"
            >
              {n}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(options ?? ["Sí", "No"]).map((opt) => (
            <button
              key={opt}
              onClick={() => onAnswer(opt)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm hover:border-primary hover:bg-accent"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
