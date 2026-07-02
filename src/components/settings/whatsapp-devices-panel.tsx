"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  PlugZap,
  PowerOff,
  RadioTower,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { maskPhone } from "@/lib/queue/customer-link";
import type {
  NotificationChannel,
  WhatsAppDevice,
  WhatsAppDeviceLog,
} from "@/lib/types/database";
import { formatDateTime } from "@/lib/utils";
import {
  createWhatsAppDeviceAction,
  revokeWhatsAppDeviceAction,
  setPrimaryWhatsAppDeviceAction,
  updateNotificationChannelAction,
  type CreateWhatsAppDeviceActionState,
} from "@/lib/whatsapp-devices/actions";

type WhatsAppDevicesPanelProps = {
  devices: WhatsAppDevice[];
  logs: WhatsAppDeviceLog[];
  messageStatusSummary: {
    pending: number;
    retry: number;
    failed: number;
  };
  notificationChannel: NotificationChannel;
};

export function WhatsAppDevicesPanel({
  devices,
  logs,
  messageStatusSummary,
  notificationChannel,
}: WhatsAppDevicesPanelProps) {
  const [createState, createAction] = useActionState(
    createWhatsAppDeviceAction,
    {
      status: "idle",
      message: "",
    } satisfies CreateWhatsAppDeviceActionState,
  );

  return (
    <section className="rounded-lg border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="rounded-lg bg-primary/10 p-3 text-primary">
            <PlugZap aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">WhatsApp</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Conecte o FasaWait Bot ou a extensao WhatsApp para enviar mensagens
              pelos dispositivos autorizados desta empresa.
            </p>
          </div>
        </div>

        <form
          action={updateNotificationChannelAction}
          className="w-full rounded-lg border bg-background p-4 xl:max-w-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="notification_channel">Canal de notificacao</Label>
            <Select
              defaultValue={notificationChannel}
              id="notification_channel"
              name="notification_channel"
            >
              <option value="none">Nenhum</option>
              <option value="simulated">Simulado</option>
              <option value="whatsapp_extension">Extensao WhatsApp</option>
            </Select>
          </div>
          <SubmitButton className="mt-4 w-full" icon={ShieldCheck} label="Salvar canal" />
        </form>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MessageStatusMetric
          detail="Aguardando o bot buscar."
          label="Pendentes"
          value={messageStatusSummary.pending}
        />
        <MessageStatusMetric
          detail="Serao reenviadas automaticamente."
          label="Em retry"
          tone="warning"
          value={messageStatusSummary.retry}
        />
        <MessageStatusMetric
          detail="Precisam de analise."
          label="Com falha"
          tone="danger"
          value={messageStatusSummary.failed}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:mt-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="rounded-lg border bg-background p-4">
          <h3 className="text-sm font-semibold text-foreground">Novo dispositivo</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            O token e o segredo HMAC aparecem apenas uma vez.
          </p>

          <form action={createAction} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp_device_name">Nome</Label>
              <Input
                id="whatsapp_device_name"
                name="name"
                placeholder="Ex.: Caixa principal"
                required
              />
            </div>
            <SubmitButton className="w-full" icon={KeyRound} label="Criar dispositivo" />
          </form>

          {createState.status === "success" ? (
            <div className="mt-4 rounded-lg border border-success/30 bg-success/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 aria-hidden className="h-4 w-4 text-success" />
                {createState.message}
              </div>
              <CredentialBlock label="Token" value={createState.token ?? ""} />
              <CredentialBlock
                label="Signing secret"
                value={createState.signingSecret ?? ""}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Depois de sair desta tela, estas credenciais nao serao exibidas novamente.
              </p>
            </div>
          ) : null}

          {createState.status === "error" ? (
            <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm font-medium text-danger">
              {createState.message}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="grid gap-3">
            {devices.map((device) => (
              <DeviceCard device={device} key={device.id} />
            ))}
            {devices.length === 0 ? (
              <EmptyState
                className="min-h-64"
                icon={RadioTower}
                title="Nenhum dispositivo"
                description="Crie um dispositivo para conectar o FasaWait Bot."
              />
            ) : null}
          </div>

          <div className="rounded-lg border bg-background p-4">
            <h3 className="text-sm font-semibold text-foreground">Ultimos logs</h3>
            <div className="mt-3 divide-y">
              {logs.map((log) => (
                <div className="py-3" key={log.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="break-words text-sm font-medium text-foreground">
                      {log.event_type}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                  {log.message ? (
                    <p className="mt-1 break-words text-sm text-muted-foreground">{log.message}</p>
                  ) : null}
                </div>
              ))}
              {logs.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Nenhum log registrado.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CredentialBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 rounded-lg bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <code className="mt-1 block break-all text-xs text-foreground">{value}</code>
      <Button
        className="mt-3"
        size="sm"
        type="button"
        variant="outline"
        onClick={() => void navigator.clipboard.writeText(value)}
      >
        <Copy aria-hidden className="h-3.5 w-3.5" />
        Copiar
      </Button>
    </div>
  );
}

function MessageStatusMetric({
  detail,
  label,
  tone = "default",
  value,
}: {
  detail: string;
  label: string;
  tone?: "default" | "warning" | "danger";
  value: number;
}) {
  return (
    <div
      className={[
        "rounded-lg border bg-background p-3",
        tone === "warning" ? "border-warning/30 bg-warning/10" : "",
        tone === "danger" ? "border-danger/30 bg-danger/10" : "",
      ].join(" ")}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function DeviceCard({ device }: { device: WhatsAppDevice }) {
  return (
    <article className="rounded-lg border bg-background p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{device.name}</h3>
            <StatusBadge status={device.status} />
            {device.is_primary_sender ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                Emissor principal
              </span>
            ) : null}
          </div>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <span>Ultimo heartbeat: {device.last_seen_at ? formatDateTime(device.last_seen_at) : "Nunca"}</span>
            <span>Telefone: {device.connected_phone ? maskPhone(device.connected_phone) : "Nao conectado"}</span>
            <span>Ultima conexao: {device.last_connected_at ? formatDateTime(device.last_connected_at) : "Nunca"}</span>
            <span>Ultima queda: {device.last_disconnected_at ? formatDateTime(device.last_disconnected_at) : "Nunca"}</span>
            <span>Versao: {device.extension_version ?? "Nao informada"}</span>
            <span>Navegador: {device.browser_name ?? "Nao informado"}</span>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
          {!device.is_primary_sender && device.status !== "revoked" ? (
            <form action={setPrimaryWhatsAppDeviceAction}>
              <input name="device_id" type="hidden" value={device.id} />
              <SubmitButton
                className="w-full"
                icon={RadioTower}
                label="Definir primary"
                variant="outline"
              />
            </form>
          ) : null}
          {device.status !== "revoked" ? (
            <form action={revokeWhatsAppDeviceAction}>
              <input name="device_id" type="hidden" value={device.id} />
              <SubmitButton
                className="w-full"
                icon={PowerOff}
                label="Revogar"
                variant="destructive"
              />
            </form>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function SubmitButton({
  icon: Icon,
  label,
  className,
  variant = "default",
}: {
  icon: typeof KeyRound;
  label: string;
  className?: string;
  variant?: "default" | "outline" | "destructive";
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
