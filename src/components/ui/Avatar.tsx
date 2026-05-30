import { cn } from "@/lib/utils";

type AvatarProps = {
  initials: string;
  label?: string;
  className?: string;
};

export function Avatar({ initials, label, className }: AvatarProps) {
  return (
    <div
      aria-label={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground",
        className,
      )}
    >
      {initials}
    </div>
  );
}
