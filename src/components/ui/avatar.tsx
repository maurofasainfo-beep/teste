import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string;
  label?: string;
  className?: string;
};

export function Avatar({ name, label, className }: AvatarProps) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
        {initials || "QS"}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        {label ? (
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        ) : null}
      </div>
    </div>
  );
}
