"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Phone,
  RefreshCw,
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
    const releasedExpiresAt = entry.expires_at
      ? new Date(entry.expires_at).getTime()
      : null;
    const isReleasedExpired =
      entry.status === "released" &&
      (entry.is_expired ||
        (releasedExpiresAt !== null &&
          !Number.isNaN(releasedExpiresAt) &&
          now >= releasedExpiresAt));

    if (isReleasedExpired) {
      return "expired";
    }

    return entry.status;
  }, [entry.expires_at, entry.is_expired, entry.status, now]);

  const remainingSeconds = useMemo(() => {
    if (viewStatus !== "released" || !entry.expires_at) return null;
    return Math.max(0, Math.ceil((new Date(entry.expires_at).getTime() - now) / 1000));
  }, [entry.expires_at, now, viewStatus]);

  const statusCopy = getStatusCopy(viewStatus, remainingSeconds);
  const showCustomerDetails = viewStatus === "waiting" || viewStatus === "released";
  const canRefresh = viewStatus === "waiting" || viewStatus === "released";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] items-center px-3 py-3 sm:px-4 sm:py-5">
      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="w-full overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
        initial={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.25 }}
      >
        <header className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UsersRound aria-hidden className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-sm font-semibold text-foreground">
              Minha posicao na fila
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {viewStatus === "expired" ? "Link expirado" : entry.company_trade_name}
            </p>
          </div>
          {canRefresh ? (
            <Button
              aria-label="Atualizar"
              className="h-9 w-9 rounded-full p-0"
              disabled={refreshing}
              size="icon"
              type="button"
              variant="ghost"
              onClick={() => void refreshEntry()}
            >
              <RefreshCw
                aria-hidden
                className={cn("h-4 w-4", refreshing && "animate-spin")}
              />
            </Button>
          ) : (
            <div className="h-9 w-9" />
          )}
        </header>

        <div className="space-y-3 px-4 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              initial={{ opacity: 0, y: 8 }}
              key={viewStatus}
            >
              {showCustomerDetails ? (
                <CustomerDetails entry={entry} viewStatus={viewStatus} />
              ) : (
                <StatusOnly statusCopy={statusCopy} viewStatus={viewStatus} />
              )}
            </motion.div>
          </AnimatePresence>

          {viewStatus === "waiting" ? (
            <LeaveQueueDialog token={token} onLeft={() => void refreshEntry()} />
          ) : null}

          {viewStatus === "released" && remainingSeconds !== null ? (
            <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-center text-xs font-semibold text-foreground">
              Tempo restante do link: {formatRemainingTime(remainingSeconds)}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
            <p className="text-[11px] leading-4 text-muted-foreground">
              {viewStatus === "expired"
                ? "Dados do atendimento foram ocultados apos a expiracao."
                : "Telefone protegido e exibido apenas mascarado."}
            </p>
            {canRefresh ? (
              <Button
                className="h-8 rounded-full px-3 text-[11px]"
                disabled={refreshing}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => void refreshEntry()}
              >
                {refreshing ? "Atualizando" : "Atualizar"}
              </Button>
            ) : null}
          </div>
        </div>
      </motion.section>
    </div>
  );
}

function CustomerDetails({
  entry,
  viewStatus,
}: {
  entry: PublicCustomerQueueEntry;
  viewStatus: CustomerViewStatus;
}) {
  const positionText = getPositionText(entry);
  const peopleText = `${entry.party_size ?? 1} ${
    entry.party_size === 1 ? "pessoa" : "pessoas"
  }`;

  return (
    <div className="space-y-3">
      <section
        className={cn(
          "relative flex h-[172px] flex-col items-center justify-center overflow-hidden rounded-[1.75rem] px-5 text-center text-white shadow-[0_18px_40px_rgba(15,118,110,0.24)]",
          viewStatus === "released"
            ? "bg-[linear-gradient(135deg,#10B981_0%,#0F766E_58%,#0F172A_100%)]"
            : "bg-[linear-gradient(135deg,#0F766E_0%,#14B8A6_52%,#0F172A_100%)]",
        )}
      >
        <div className="absolute -left-10 -top-12 h-32 w-32 rounded-full bg-white/15 blur-xl" />
        <div className="absolute -bottom-12 -right-8 h-36 w-36 rounded-full bg-white/10 blur-xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
          {viewStatus === "released" ? "Voce foi chamado" : "Posicao atual"}
        </p>
        <p className="relative mt-2 text-6xl font-bold leading-none tracking-normal">
          {positionText}
        </p>
        <p className="relative mt-2 text-sm font-medium text-white/85">
          {viewStatus === "released" ? "compareca ao atendimento" : "na fila de espera"}
        </p>
      </section>

      <section className="rounded-[1.5rem] border border-border/70 bg-background p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground">
            {getCompanyInitial(entry.company_trade_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-foreground">
                {entry.company_trade_name}
              </p>
              <StatusBadge className="shrink-0 text-[10px]" status={entry.status} />
            </div>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {entry.customer_name ?? "Cliente"}, voce esta em{" "}
              <span className="font-semibold text-foreground">{positionText}</span>{" "}
              na fila para {peopleText}.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {entry.ticket_code ? <span>Codigo: {entry.ticket_code}</span> : null}
          <span>{entry.masked_customer_phone ?? "*****"}</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <InfoItem icon={UsersRound} label="Pessoas" value={peopleText} />
        <InfoItem
          icon={Phone}
          label="Telefone"
          value={entry.masked_customer_phone ?? "*****"}
        />
        <InfoItem
          icon={CalendarClock}
          label="Entrada"
          value={entry.created_at ? formatCompactDateTime(entry.created_at) : "-"}
        />
        <InfoItem icon={Clock3} label="Status" value={getCompactStatus(entry.status)} />
      </section>

      {viewStatus === "waiting" && entry.estimated_wait_available ? (
        <section className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Clock3 aria-hidden className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-muted-foreground">
              Tempo estimado
            </p>
            <p className="mt-0.5 text-lg font-semibold text-foreground">
              {entry.estimated_wait_label ?? "Calculando"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Baseado no fluxo atual
            </p>
          </div>
        </section>
      ) : null}

      <p className="px-1 text-center text-xs leading-5 text-muted-foreground">
        {viewStatus === "released"
          ? "Compareca ao atendimento agora."
          : "Acompanhe este link. Ele atualiza quando sua vez chegar."}
      </p>
    </div>
  );
}

function StatusOnly({
  statusCopy,
  viewStatus,
}: {
  statusCopy: { title: string; description: string };
  viewStatus: CustomerViewStatus;
}) {
  const Icon = viewStatus === "completed" ? CheckCircle2 : Clock3;

  return (
    <div className="space-y-3">
      <section
        className={cn(
          "flex h-[172px] flex-col items-center justify-center rounded-[1.75rem] px-5 text-center",
          viewStatus === "expired" && "bg-warning/10 text-warning",
          viewStatus === "cancelled" && "bg-danger/10 text-danger",
          viewStatus === "completed" && "bg-primary/10 text-primary",
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card shadow-sm">
          <Icon aria-hidden className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-normal text-foreground">
          {statusCopy.title}
        </h2>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          {statusCopy.description}
        </p>
      </section>
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
    <div className="min-w-0 rounded-2xl border border-border/70 bg-background px-3 py-2.5">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon aria-hidden className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">
        {value}
      </p>
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

function getPositionText(entry: PublicCustomerQueueEntry) {
  if (!entry.position) {
    return "Agora";
  }

  return `${entry.position}º`;
}

function getCompanyInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "Q";
}

function getCompactStatus(status: PublicCustomerQueueEntry["status"]) {
  const labels = {
    waiting: "Na fila",
    released: "Liberado",
    completed: "Concluido",
    cancelled: "Cancelado",
  };

  return labels[status];
}

function formatCompactDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return formatDateTime(value);
  }

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
