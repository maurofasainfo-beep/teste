import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: number | string;
  detail?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
  className?: string;
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
}: MetricCardProps) {
  return (
    <section
      className={cn(
        "rounded-lg border bg-card p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-normal text-foreground">
            {value}
          </p>
        </div>
        <div className={cn("rounded-lg p-2.5 ring-1", toneMap[tone])}>
          <Icon aria-hidden className="h-5 w-5" />
        </div>
      </div>
      {detail ? <p className="mt-4 text-xs text-muted-foreground">{detail}</p> : null}
    </section>
  );
}
