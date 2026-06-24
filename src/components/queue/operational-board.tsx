"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  Check,
  Clock3,
  ListChecks,
  Loader2,
  Phone,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  cancelQueueEntryAction,
  completeQueueEntryAction,
  releaseQueueEntryAction,
} from "@/app/actions";
import { CustomerLinkActions } from "@/components/customer-queue/customer-link-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { buildCustomerQueueLink, maskPhone } from "@/lib/queue/customer-link";
import {
  createQueueEntryWithLinkAction,
  type CreateQueueEntryActionState,
} from "@/lib/queue/customer-queue-actions";
import { createClient } from "@/lib/supabase/browser";
import type { QueueEntry } from "@/lib/types/database";
import { cn, formatDateTime } from "@/lib/utils";

type OperationalBoardProps = {
  companyId: string;
  initialEntries: QueueEntry[];
};

export function OperationalBoard({
  companyId,
  initialEntries,
}: OperationalBoardProps) {
  const [entries, setEntries] = useState(initialEntries);
  const formRef = useRef<HTMLFormElement>(null);
  const [createState, createAction] = useActionState(
    createQueueEntryWithLinkAction,
    {
      status: "idle",
      message: "",
    } satisfies CreateQueueEntryActionState,
  );

  const refreshEntries = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("company_id", companyId)
      .in("status", ["waiting", "released"])
      .order("position", { ascending: true, nullsFirst: false })
      .order("released_at", { ascending: false, nullsFirst: false });

    if (data) {
      setEntries(data);
    }
  }, [companyId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`queue-entries:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_entries",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          void refreshEntries();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId, refreshEntries]);

  const waiting = useMemo(
    () => entries.filter((entry) => entry.status === "waiting"),
    [entries],
  );
  const released = useMemo(
    () => entries.filter((entry) => entry.status === "released"),
    [entries],
  );

  useEffect(() => {
    if (createState.status === "success") {
      formRef.current?.reset();
    }
  }, [createState.status]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        <MetricCard
          compact
          detail="Aguardando chamada"
          icon={Clock3}
          label="Na fila"
          tone="warning"
          value={waiting.length}
        />
        <MetricCard
          compact
          detail="Chamados em andamento"
          icon={BellRing}
          label="Liberados"
          tone="success"
          value={released.length}
        />
        <MetricCard
          compact
          detail="Cards sincronizados por Realtime"
          icon={ListChecks}
          label="Operacao ativa"
          tone="primary"
          value={entries.length}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-lg border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-foreground">Novo cliente</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Entrada rapida na fila operacional.
            </p>
          </div>
          <form ref={formRef} action={createAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Nome</Label>
              <Input
                autoComplete="name"
                id="customer_name"
                name="customer_name"
                placeholder="Nome do cliente"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_phone">Telefone</Label>
              <Input
                autoComplete="tel"
                id="customer_phone"
                name="customer_phone"
                placeholder="(00) 00000-0000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="party_size">Quantidade de pessoas</Label>
              <Input
                id="party_size"
                inputMode="numeric"
                max={20}
                min={1}
                name="party_size"
                placeholder="Ex.: 2"
                required
                type="number"
              />
            </div>
            <SubmitButton className="w-full" icon={UserPlus} label="Adicionar" />
          </form>

          {createState.status === "success" && createState.customerLink ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-lg border border-success/30 bg-success/10 p-4"
              initial={{ opacity: 0, y: 8 }}
            >
              <p className="text-sm font-semibold text-foreground">
                {createState.message}
              </p>
              <div className="mt-3 rounded-lg bg-card p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Link do cliente
                </p>
                <p className="mt-2 break-all text-xs text-muted-foreground">
                  {createState.customerLink}
                </p>
              </div>
              <CustomerLinkActions
                className="mt-3"
                customerLink={createState.customerLink}
                compact
              />
            </motion.div>
          ) : null}

          {createState.status === "error" ? (
            <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm font-medium text-danger">
              {createState.message}
            </div>
          ) : null}
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          <QueueColumn
            entries={waiting}
            title="Na fila"
            variant="waiting"
          />
          <QueueColumn
            entries={released}
            title="Liberados"
            variant="released"
          />
        </div>
      </div>
    </div>
  );
}

function QueueColumn({
  title,
  entries,
  variant,
}: {
  title: string;
  entries: QueueEntry[];
  variant: "waiting" | "released";
}) {
  return (
    <section className="min-h-[320px] rounded-lg border bg-card p-4 shadow-[var(--shadow-soft)] sm:min-h-[420px] xl:min-h-[520px]">
      <div className="mb-4 flex items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {variant === "waiting" ? "Ordem de atendimento" : "Clientes chamados"}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold">
          {entries.length}
        </span>
      </div>

      <div className="grid gap-3">
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <QueueCard entry={entry} key={entry.id} variant={variant} />
          ))}
        </AnimatePresence>
        {entries.length === 0 ? (
          <EmptyState
            className="min-h-52 sm:min-h-72"
            icon={UserRound}
            title="Nenhum cliente"
            description="Novas entradas aparecem aqui automaticamente."
          />
        ) : null}
      </div>
    </section>
  );
}

function QueueCard({
  entry,
  variant,
}: {
  entry: QueueEntry;
  variant: "waiting" | "released";
}) {
  return (
    <motion.article
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={cn(
        "rounded-lg border bg-background p-4 shadow-sm transition-all motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-primary/30 motion-safe:hover:bg-card motion-safe:hover:shadow-[var(--shadow-soft)]",
        variant === "released" && "border-success/30 bg-success/5",
      )}
      exit={{ opacity: 0, scale: 0.98, y: -8 }}
      initial={{ opacity: 0, scale: 0.98, y: 8 }}
      layout
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-semibold text-foreground">
              {entry.customer_name}
            </p>
            <StatusBadge status={entry.status} />
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Phone aria-hidden className="h-3.5 w-3.5" />
              {maskPhone(entry.customer_phone)}
            </span>
            <span className="inline-flex items-center gap-1">
              <UsersRound aria-hidden className="h-3.5 w-3.5" />
              {entry.party_size} {entry.party_size === 1 ? "pessoa" : "pessoas"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 aria-hidden className="h-3.5 w-3.5" />
              {formatDateTime(entry.created_at)}
            </span>
            {entry.position ? (
              <span>Posicao {entry.position}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <CustomerLinkActions
          className="w-full lg:w-auto"
          customerLink={buildCustomerQueueLink(entry.public_customer_token)}
          compact
        />
        <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto lg:flex lg:flex-wrap lg:justify-end">
        {variant === "waiting" ? (
          <form action={releaseQueueEntryAction} className="min-w-0">
            <input type="hidden" name="queue_entry_id" value={entry.id} />
            <SubmitButton className="w-full" icon={BellRing} label="Chamar" />
          </form>
        ) : null}
        <form action={completeQueueEntryAction} className="min-w-0">
          <input type="hidden" name="queue_entry_id" value={entry.id} />
          <SubmitButton
            className="w-full"
            icon={Check}
            label="Concluir"
            variant="secondary"
          />
        </form>
        <form action={cancelQueueEntryAction} className="min-w-0">
          <input type="hidden" name="queue_entry_id" value={entry.id} />
          <SubmitButton
            className="w-full"
            icon={X}
            label="Cancelar"
            variant="destructive"
          />
        </form>
        </div>
      </div>
    </motion.article>
  );
}

function SubmitButton({
  icon: Icon,
  label,
  className,
  variant = "default",
}: {
  icon: typeof UserPlus;
  label: string;
  className?: string;
  variant?: "default" | "secondary" | "destructive";
}) {
  const { pending } = useFormStatus();

  return (
    <Button className={className} disabled={pending} type="submit" variant={variant}>
      {pending ? (
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      ) : (
        <Icon aria-hidden className="h-4 w-4" />
      )}
      {pending ? "Processando" : label}
    </Button>
  );
}
