"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, BellRing, CheckCircle2, Clock3, ListChecks } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/browser";
import type { QueueEntry, QueueEntryStatus } from "@/lib/types/database";
import { formatDateTime } from "@/lib/utils";

type DashboardMetrics = Record<QueueEntryStatus, number>;

type LiveDashboardProps = {
  companyId: string;
  initialMetrics: DashboardMetrics;
  initialRecentEntries: QueueEntry[];
};

const metricCards: Array<{
  status: QueueEntryStatus;
  label: string;
  icon: typeof Clock3;
  tone: "primary" | "success" | "warning" | "danger" | "neutral";
}> = [
  { status: "waiting", label: "Fila ativa", icon: Clock3, tone: "warning" },
  { status: "released", label: "Liberados", icon: BellRing, tone: "success" },
  { status: "completed", label: "Concluidos", icon: CheckCircle2, tone: "primary" },
  { status: "cancelled", label: "Cancelados", icon: Activity, tone: "danger" },
];

export function LiveDashboard({
  companyId,
  initialMetrics,
  initialRecentEntries,
}: LiveDashboardProps) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [recentEntries, setRecentEntries] = useState(initialRecentEntries);

  const refreshDashboard = useCallback(async () => {
    const supabase = createClient();
    const counts = await Promise.all(
      metricCards.map(async (item) => {
        const { count } = await supabase
          .from("queue_entries")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", item.status);

        return [item.status, count ?? 0] as const;
      }),
    );

    const { data } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(8);

    setMetrics(Object.fromEntries(counts) as DashboardMetrics);
    if (data) setRecentEntries(data);
  }, [companyId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`dashboard:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_entries",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          void refreshDashboard();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId, refreshDashboard]);

  const activeTotal = metrics.waiting + metrics.released;
  const handledTotal = metrics.completed + metrics.cancelled;
  const total = activeTotal + handledTotal;
  const completionRate = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((metrics.completed / total) * 100);
  }, [metrics.completed, total]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((item, index) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 12 }}
            key={item.status}
            transition={{ delay: index * 0.05 }}
          >
            <MetricCard
              detail={item.status === "waiting" ? "Atualizado em tempo real" : undefined}
              icon={item.icon}
              label={item.label}
              tone={item.tone}
              value={metrics[item.status]}
            />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="rounded-lg border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Atividade recente
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ultimas movimentacoes da fila.
              </p>
            </div>
            <StatusBadge status={activeTotal > 0 ? "active" : "inactive"} />
          </div>

          <div className="mt-5 space-y-3">
            {recentEntries.map((entry) => (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                initial={{ opacity: 0, y: 8 }}
                key={entry.id}
                layout
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {entry.customer_name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.ticket_code} | {formatDateTime(entry.created_at)}
                  </p>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={entry.status} />
                </div>
              </motion.div>
            ))}

            {recentEntries.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="Sem movimentacoes"
                description="A atividade aparece assim que a operacao comecar."
              />
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
          <h2 className="text-base font-semibold text-foreground">
            Saude operacional
          </h2>
          <div className="mt-5 rounded-lg bg-secondary p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Conclusao</span>
              <span className="font-semibold text-primary">{completionRate}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-card">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
          <div className="mt-5 grid gap-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Em atendimento</span>
              <strong>{activeTotal}</strong>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground">Historico</span>
              <strong>{handledTotal}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
