import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: number | string;
  detail?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
  className?: string;
  compact?: boolean;
};

const toneMap = {
  primary: "bg-primary/10 text-primary ring-primary/10",
  success: "bg-success/10 text-success ring-success/10",
  warning: "bg-warning/10 text-warning ring-warning/10",
  danger: "bg-danger/10 text-danger ring-danger/10",
  neutral: "bg-secondary text-muted-foreground ring-border",
};

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "primary",
  className,
  compact = false,
}: MetricCardProps) {
  return (
    <section
      className={cn(
        "rounded-lg border bg-card shadow-[var(--shadow-soft)] transition-all motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[var(--shadow-panel)]",
        compact ? "p-3 sm:p-4" : "p-4 sm:p-5",
        className,
      )}
    >
      <div className={cn("flex items-start justify-between", compact ? "gap-2" : "gap-4")}>
        <div className="min-w-0">
          <p
            className={cn(
              "font-medium text-muted-foreground",
              compact ? "truncate text-[11px] sm:text-xs" : "text-sm",
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "font-semibold tracking-normal text-foreground",
              compact ? "mt-1 text-xl sm:text-2xl" : "mt-2 text-2xl sm:mt-3 sm:text-3xl",
            )}
          >
            {value}
          </p>
        </div>
        <div className={cn("rounded-lg ring-1", compact ? "p-2" : "p-2.5", toneMap[tone])}>
          <Icon aria-hidden className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </div>
      </div>
      {detail ? (
        <p
          className={cn(
            "text-muted-foreground",
            compact ? "mt-2 hidden text-[11px] sm:block" : "mt-3 text-xs sm:mt-4",
          )}
        >
          {detail}
        </p>
      ) : null}
    </section>
  );
}
