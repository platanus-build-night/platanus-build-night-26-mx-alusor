import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type MarkdownMessageProps = {
  children: string;
  className?: string;
};

export function MarkdownMessage({ children, className }: MarkdownMessageProps) {
  return (
    <div className={cn("text-sm leading-relaxed text-foreground", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, ...props }) => (
            <a
              className="font-medium text-primary underline decoration-primary/30 underline-offset-4"
              target="_blank"
              rel="noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          code: ({ children, ...props }) => (
            <code
              className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
              {...props}
            >
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-xl bg-foreground p-4 text-sm leading-6 text-background">
              {children}
            </pre>
          ),
          ul: ({ children }) => (
            <ul className="my-3 list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-1 pl-5">{children}</ol>
          ),
          p: ({ children }) => (
            <p className="my-2 first:mt-0 last:mb-0">{children}</p>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-4 border-border pl-4 text-muted-foreground">
              {children}
            </blockquote>
          ),
          h1: ({ children }) => (
            <h1 className="mb-2 mt-4 font-display text-xl font-semibold">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 font-display text-lg font-semibold">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-3 font-display text-base font-semibold">
              {children}
            </h3>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-muted px-3 py-2 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-2">{children}</td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
