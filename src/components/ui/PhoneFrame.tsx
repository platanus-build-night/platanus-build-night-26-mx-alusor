import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PhoneFrameProps = {
  children: ReactNode;
  className?: string;
  screenClassName?: string;
};

/**
 * Simulated phone for the "Vista del paciente" preview. The screen is split into
 * a status bar (with the Dynamic Island), the content area (where the <iframe>
 * goes — inset BELOW the island and ABOVE the home indicator so the patient app
 * never renders under the notch), and a home indicator. Scales with the
 * container height (keeps aspect ratio) and is comfortably large.
 */
export function PhoneFrame({ children, className, screenClassName }: PhoneFrameProps) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[100/207] h-full max-h-[800px] min-h-[560px] rounded-[48px] border-[9px] border-foreground bg-foreground p-1.5 shadow-xl",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-[40px] bg-background text-foreground",
          screenClassName,
        )}
      >
        {/* status bar + Dynamic Island */}
        <div className="relative flex h-11 shrink-0 items-center justify-center">
          <div className="h-7 w-24 rounded-full bg-foreground" />
        </div>
        {/* content (iframe) — fills the safe area between island and home bar */}
        <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
        {/* home indicator */}
        <div className="flex h-6 shrink-0 items-center justify-center">
          <div className="h-1.5 w-32 rounded-full bg-foreground/25" />
        </div>
      </div>
    </div>
  );
}
