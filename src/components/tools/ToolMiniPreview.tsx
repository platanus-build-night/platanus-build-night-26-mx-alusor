import type { PatientTool } from "./types";

type ToolMiniPreviewProps = {
  tool: PatientTool;
};

export function ToolMiniPreview({ tool }: ToolMiniPreviewProps) {
  return (
    <div className="relative h-52 w-32 overflow-hidden rounded-t-[22px] border-[5px] border-foreground bg-background shadow-xl">
      <div
        className="flex h-8 items-center justify-between px-3 text-[7px] font-semibold text-primary-foreground"
        style={{ backgroundColor: tool.preview.color }}
      >
        <span>{tool.preview.title}</span>
        <span>☰</span>
      </div>
      <div className="space-y-2 p-3 text-[7px]">
        {tool.preview.fields.map((field) => (
          <div key={`${tool.id}-${field.label}`}>
            <p className="mb-1 font-semibold leading-tight">{field.label}</p>
            <div className="rounded border border-border bg-card px-2 py-1.5 text-muted-foreground">
              {field.value || "Describe aquí..."}
            </div>
          </div>
        ))}
        <div className="mt-3 h-1.5 rounded-full bg-muted">
          <div className="h-full w-2/3 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
