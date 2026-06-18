import Link from "next/link";
import {
  Building2,
  ExternalLink,
  Globe2,
  MessageSquareText,
  PlugZap,
  Save,
  Settings2,
  TimerReset,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PublicPageBrandingPanel } from "@/components/settings/public-page-branding-panel";
import { WhatsAppDevicesPanel } from "@/components/settings/whatsapp-devices-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/auth/session";
import { normalizePublicPageBranding } from "@/lib/public-page-branding";
import { updateQueueSettingsAction } from "@/lib/queue/customer-queue-actions";
import { createClient } from "@/lib/supabase/server";

const sections = [
  {
    title: "Empresa",
    description: "Dados principais e status operacional.",
    icon: Building2,
  },
  {
    title: "Display",
    description: "Painel publico em tempo real.",
    icon: Globe2,
  },
  {
    title: "Mensageria",
    description: "Templates e eventos registrados.",
    icon: MessageSquareText,
  },
  {
    title: "Fila",
    description: "Links individuais e validade apos chamada.",
    icon: TimerReset,
  },
  {
    title: "Integracoes",
    description: "Canais e provedores de mensageria.",
    icon: PlugZap,
  },
];

export default async function SettingsPage() {
  const { company } = await requireAdmin();
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("company_settings")
    .select("*")
    .eq("company_id", company.id)
    .maybeSingle();
  const { data: whatsappDevices } = await supabase
    .from("whatsapp_devices")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });
  const { data: whatsappLogs } = await supabase
    .from("whatsapp_device_logs")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const releasedExpirationMinutes =
    settings?.released_link_expiration_minutes ?? 5;
  const notificationChannel = settings?.notification_channel ?? "simulated";
  const estimatedWaitEnabled = settings?.estimated_wait_enabled ?? true;
  const estimatedWaitDefaultMinutes =
    settings?.estimated_wait_default_minutes ?? 15;
  const estimatedWaitSampleSize = settings?.estimated_wait_sample_size ?? 10;
  const estimatedWaitMarginPercent =
    settings?.estimated_wait_margin_percent ?? 25;
  const publicPageBranding = normalizePublicPageBranding(settings ?? {});

  return (
    <>
      <PageHeader
        title="Configuracoes"
        description="Centro de controle da experiencia da empresa."
        action={<StatusBadge status={company.status} />}
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-lg border bg-card p-3 shadow-[var(--shadow-soft)]">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-secondary"
                key={section.title}
              >
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon aria-hidden className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {section.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {section.description}
                  </p>
                </div>
              </div>
            );
          })}
        </aside>

        <div className="space-y-6">
          <section className="rounded-lg border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3 text-primary">
                <Settings2 aria-hidden className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-foreground">
                  URLs publicas
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Link usado por clientes finais e displays de TV.
                </p>
                <div className="mt-4 flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                  <code className="break-all text-sm text-foreground">
                    /display/{company.public_queue_slug}
                  </code>
                  <Button asChild variant="outline">
                    <Link href={`/display/${company.public_queue_slug}`} target="_blank">
                      <ExternalLink aria-hidden className="h-4 w-4" />
                      Abrir
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <WhatsAppDevicesPanel
            devices={whatsappDevices ?? []}
            logs={whatsappLogs ?? []}
            notificationChannel={notificationChannel}
          />

          <section className="rounded-lg border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3 text-primary">
                  <TimerReset aria-hidden className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Fila
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    Controle a validade do link e a estimativa exibida ao cliente.
                  </p>
                </div>
              </div>

              <form
                action={updateQueueSettingsAction}
                className="w-full rounded-lg border bg-background p-4 lg:max-w-xl"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="released_link_expiration_minutes">
                      Validade apos liberacao
                    </Label>
                    <Input
                      defaultValue={releasedExpirationMinutes}
                      id="released_link_expiration_minutes"
                      inputMode="numeric"
                      max={60}
                      min={1}
                      name="released_link_expiration_minutes"
                      required
                      type="number"
                    />
                    <p className="text-xs text-muted-foreground">De 1 a 60 minutos.</p>
                  </div>

                  <label
                    className="flex min-h-20 cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2"
                    htmlFor="estimated_wait_enabled"
                  >
                    <input name="estimated_wait_enabled" type="hidden" value="false" />
                    <input
                      className="h-4 w-4 accent-primary"
                      defaultChecked={estimatedWaitEnabled}
                      id="estimated_wait_enabled"
                      name="estimated_wait_enabled"
                      type="checkbox"
                      value="true"
                    />
                    <span>
                      <span className="block text-sm font-medium text-foreground">
                        Exibir tempo estimado
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Visivel apenas enquanto o cliente aguarda.
                      </span>
                    </span>
                  </label>

                  <div className="space-y-2">
                    <Label htmlFor="estimated_wait_default_minutes">
                      Tempo padrao por cliente
                    </Label>
                    <Input
                      defaultValue={estimatedWaitDefaultMinutes}
                      id="estimated_wait_default_minutes"
                      inputMode="numeric"
                      max={120}
                      min={1}
                      name="estimated_wait_default_minutes"
                      required
                      type="number"
                    />
                    <p className="text-xs text-muted-foreground">Usado sem historico.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimated_wait_sample_size">
                      Atendimentos considerados
                    </Label>
                    <Input
                      defaultValue={estimatedWaitSampleSize}
                      id="estimated_wait_sample_size"
                      inputMode="numeric"
                      max={50}
                      min={3}
                      name="estimated_wait_sample_size"
                      required
                      type="number"
                    />
                    <p className="text-xs text-muted-foreground">De 3 a 50 recentes.</p>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="estimated_wait_margin_percent">
                      Margem da estimativa (%)
                    </Label>
                    <Input
                      defaultValue={estimatedWaitMarginPercent}
                      id="estimated_wait_margin_percent"
                      inputMode="numeric"
                      max={100}
                      min={0}
                      name="estimated_wait_margin_percent"
                      required
                      type="number"
                    />
                    <p className="text-xs text-muted-foreground">
                      Define a faixa minima e maxima mostrada ao cliente.
                    </p>
                  </div>
                </div>
                <Button className="mt-4 w-full" type="submit">
                  <Save aria-hidden className="h-4 w-4" />
                  Salvar configuracao
                </Button>
              </form>
            </div>
          </section>

          <PublicPageBrandingPanel
            initialBranding={publicPageBranding}
            key={publicPageBranding.backgroundUrl ?? "no-background"}
          />

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-5 shadow-[var(--shadow-soft)]">
              <h2 className="text-base font-semibold text-foreground">Empresa</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {company.trade_name}
              </p>
              <div className="mt-4">
                <StatusBadge status={company.status} />
              </div>
            </div>
            <div className="rounded-lg border bg-card p-5 shadow-[var(--shadow-soft)]">
              <h2 className="text-base font-semibold text-foreground">Mensageria</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Eventos registrados para envio por WhatsApp.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
