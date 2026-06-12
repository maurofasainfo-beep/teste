"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Hash,
  Phone,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { LeaveQueueDialog } from "@/components/customer-queue/leave-queue-dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/browser";
import type { PublicCustomerQueueEntry } from "@/lib/types/database";
import { cn, formatDateTime } from "@/lib/utils";

type CustomerStatusCardProps = {
  token: string;
  initialEntry: PublicCustomerQueueEntry;
};

type CustomerViewStatus =
  | "waiting"
  | "released"
  | "expired"
  | "cancelled"
  | "completed";

export function CustomerStatusCard({
  token,
  initialEntry,
}: CustomerStatusCardProps) {
  const [entry, setEntry] = useState(initialEntry);
  const [now, setNow] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);

  const refreshEntry = useCallback(async () => {
    setRefreshing(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("get_public_customer_queue_entry", {
      customer_token: token,
    });

    if (data?.[0]) {
      setEntry(data[0]);
    }

    setRefreshing(false);
  }, [token]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`public-customer-queue:${token}`, {
        config: { private: false },
      })
      .on("broadcast", { event: "queue_changed" }, () => {
        void refreshEntry();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshEntry, token]);

  const viewStatus: CustomerViewStatus = useMemo(() => {
    if (entry.status === "released" && entry.is_expired) {
      return "expired";
    }

    return entry.status;
  }, [entry.is_expired, entry.status]);

  const remainingSeconds = useMemo(() => {
    if (viewStatus !== "released" || !entry.expires_at) return null;
    return Math.max(0, Math.ceil((new Date(entry.expires_at).getTime() - now) / 1000));
  }, [entry.expires_at, now, viewStatus]);

  const statusCopy = getStatusCopy(viewStatus, remainingSeconds);
  const showCustomerDetails = viewStatus === "waiting" || viewStatus === "released";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-6 sm:px-6">
      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="w-full overflow-hidden rounded-lg border bg-card shadow-[var(--shadow-panel)]"
        initial={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.25 }}
      >
        <div
          className={cn(
            "border-b p-5 sm:p-6",
            viewStatus === "released" && "bg-success/10",
            viewStatus === "expired" && "bg-warning/10",
            viewStatus === "cancelled" && "bg-danger/10",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
                <Building2 aria-hidden className="h-3.5 w-3.5" />
                {entry.company_trade_name}
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
                {statusCopy.title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {statusCopy.description}
              </p>
            </div>
            <StatusBadge status={entry.status} />
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              initial={{ opacity: 0, y: 8 }}
              key={viewStatus}
            >
              {showCustomerDetails ? (
                <CustomerDetails entry={entry} />
              ) : (
                <StatusOnly viewStatus={viewStatus} />
              )}
            </motion.div>
          </AnimatePresence>

          {viewStatus === "waiting" ? (
            <LeaveQueueDialog token={token} onLeft={() => void refreshEntry()} />
          ) : null}

          {viewStatus === "released" && remainingSeconds !== null ? (
            <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm font-medium text-foreground">
              Tempo restante do link: {formatRemainingTime(remainingSeconds)}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
              Telefone protegido e exibido apenas mascarado.
            </p>
            <Button
              disabled={refreshing}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void refreshEntry()}
            >
              {refreshing ? "Atualizando" : "Atualizar"}
            </Button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

function CustomerDetails({ entry }: { entry: PublicCustomerQueueEntry }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-primary/10 p-5">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-primary">
          <Hash aria-hidden className="h-3.5 w-3.5" />
          Posicao atual
        </p>
        <p className="mt-3 text-5xl font-semibold tracking-normal text-foreground">
          {entry.position ? String(entry.position) : "Atendimento"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Codigo de atendimento: {entry.ticket_code}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoItem
          icon={UsersRound}
          label="Quantidade"
          value={`${entry.party_size ?? 1} ${
            entry.party_size === 1 ? "pessoa" : "pessoas"
          }`}
        />
        <InfoItem
          icon={Phone}
          label="Telefone"
          value={entry.masked_customer_phone ?? "*****"}
        />
        <InfoItem
          icon={Clock3}
          label="Entrada"
          value={formatDateTime(entry.created_at)}
        />
      </div>

      {entry.customer_name ? (
        <div className="rounded-lg border bg-background p-4">
          <p className="text-xs font-medium text-muted-foreground">Cliente</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {entry.customer_name}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function StatusOnly({ viewStatus }: { viewStatus: CustomerViewStatus }) {
  const Icon = viewStatus === "completed" ? CheckCircle2 : Clock3;

  return (
    <div className="rounded-lg border bg-background p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon aria-hidden className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">
        {viewStatus === "cancelled"
          ? "Caso queira entrar novamente, procure um atendente."
          : viewStatus === "completed"
            ? "Obrigado. Seu atendimento foi finalizado."
            : "Procure um atendente caso precise de ajuda."}
      </p>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon aria-hidden className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function getStatusCopy(
  status: CustomerViewStatus,
  remainingSeconds: number | null,
) {
  if (status === "waiting") {
    return {
      title: "Voce esta na fila.",
      description: "Acompanhe sua posicao por este link. Se precisar sair, use o botao abaixo.",
    };
  }

  if (status === "released") {
    return {
      title: "Voce foi chamado.",
      description:
        remainingSeconds !== null
          ? "Compareca ao atendimento. Este link expira em breve."
          : "Compareca ao atendimento.",
    };
  }

  if (status === "expired") {
    return {
      title: "Este atendimento expirou.",
      description: "Procure um atendente caso precise de ajuda.",
    };
  }

  if (status === "completed") {
    return {
      title: "Atendimento finalizado.",
      description: "Seu atendimento foi concluido.",
    };
  }

  return {
    title: "Voce saiu da fila.",
    description: "Caso queira entrar novamente, procure um atendente.",
  };
}

function formatRemainingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
