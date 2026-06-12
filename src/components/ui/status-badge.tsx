import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: string;
  className?: string;
};

const statusMap: Record<
  string,
  { label: string; dot: string; variant: "default" | "secondary" | "warning" | "destructive" | "outline" }
> = {
  active: { label: "Ativa", dot: "bg-success", variant: "default" },
  inactive: { label: "Inativa", dot: "bg-muted-foreground", variant: "secondary" },
  waiting: { label: "Na fila", dot: "bg-warning", variant: "warning" },
  released: { label: "Liberado", dot: "bg-success", variant: "default" },
  completed: { label: "Concluido", dot: "bg-primary", variant: "outline" },
  cancelled: { label: "Cancelado", dot: "bg-danger", variant: "destructive" },
  admin: { label: "Admin", dot: "bg-primary", variant: "default" },
  employee: { label: "Employee", dot: "bg-muted-foreground", variant: "secondary" },
  owner: { label: "Owner", dot: "bg-primary", variant: "default" },
  support: { label: "Support", dot: "bg-warning", variant: "warning" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const item = statusMap[status] ?? {
    label: status,
    dot: "bg-muted-foreground",
    variant: "outline" as const,
  };

  return (
    <Badge className={className} variant={item.variant}>
      <span className={cn("h-1.5 w-1.5 rounded-full", item.dot)} />
      {item.label}
    </Badge>
  );
}
