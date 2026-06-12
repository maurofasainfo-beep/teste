import Link from "next/link";
import { Building2, ExternalLink, Globe2, Mail, ShieldCheck } from "lucide-react";
import { updateCompanyAction } from "@/app/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetricCard } from "@/components/ui/metric-card";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/auth/session";
import { formatBrazilianPhone } from "@/lib/phone";

function formatPhoneForDisplay(phone: string | null) {
  if (!phone) {
    return "";
  }

  try {
    return formatBrazilianPhone(phone);
  } catch {
    return phone;
  }
}

export default async function CompaniesPage() {
  const { company } = await requireAdmin();
  const companyPhone = formatPhoneForDisplay(company.phone);

  return (
    <>
      <PageHeader
        title="Empresa"
        description="Identidade, acesso publico e dados comerciais do tenant."
        action={<StatusBadge status={company.status} />}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          detail={company.cnpj}
          icon={Building2}
          label="Razao social"
          tone="primary"
          value={company.trade_name}
        />
        <MetricCard
          detail={company.email}
          icon={Mail}
          label="Contato"
          tone="neutral"
          value={companyPhone || "Sem telefone"}
        />
        <MetricCard
          detail={`/display/${company.public_queue_slug}`}
          icon={Globe2}
          label="URL publica"
          tone="success"
          value="Display"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-foreground">
              Dados cadastrais
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Informacoes usadas na operacao e no display publico.
            </p>
          </div>
          <form action={updateCompanyAction} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" name="cnpj" defaultValue={company.cnpj} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={company.status}>
                <option value="active">Ativa</option>
                <option value="inactive">Inativa</option>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="corporate_name">Razao social</Label>
              <Input
                id="corporate_name"
                name="corporate_name"
                defaultValue={company.corporate_name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade_name">Nome fantasia</Label>
              <Input
                id="trade_name"
                name="trade_name"
                defaultValue={company.trade_name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={company.email}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" defaultValue={companyPhone} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="public_queue_slug">Slug publico</Label>
              <Input
                id="public_queue_slug"
                name="public_queue_slug"
                defaultValue={company.public_queue_slug}
                required
              />
            </div>
            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
              <Button type="submit">Salvar empresa</Button>
              <Button asChild variant="outline">
                <Link href={`/display/${company.public_queue_slug}`} target="_blank">
                  <ExternalLink aria-hidden className="h-4 w-4" />
                  Abrir display
                </Link>
              </Button>
            </div>
          </form>
        </section>

        <aside className="rounded-lg border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck aria-hidden className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-foreground">
            {company.trade_name}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {company.corporate_name}
          </p>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={company.status} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-muted-foreground">Display</span>
              <span className="truncate font-mono text-xs">
                {company.public_queue_slug}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-muted-foreground">Telefone</span>
              <span>{companyPhone || "-"}</span>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
