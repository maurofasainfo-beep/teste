import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, KeyRound, UsersRound } from "lucide-react";
import {
  resetClientUserAccessAction,
  updateClientCompanyAction,
} from "@/lib/platform/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePlatformUser } from "@/lib/auth/platform-session";
import {
  canManageClientCompanies,
  canResetClientAccess,
} from "@/lib/platform/permissions";
import { formatBrazilianPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils";

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

export default async function PlatformCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { platformProfile } = await requirePlatformUser();
  const { id } = await params;
  const admin = createAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!company) {
    notFound();
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  const canEdit = canManageClientCompanies(platformProfile.role);
  const canReset = canResetClientAccess(platformProfile.role);
  const companyPhone = formatPhoneForDisplay(company.phone);

  return (
    <>
      <PageHeader
        title={company.trade_name}
        description="Administracao da empresa cliente."
        action={
          <Button asChild variant="outline">
            <Link href="/platform/companies">
              <ArrowLeft aria-hidden className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-lg border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Building2 aria-hidden className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Empresa</h2>
          </div>
          <form action={updateClientCompanyAction} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="company_id" value={company.id} />
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                name="cnpj"
                defaultValue={company.cnpj}
                disabled={!canEdit}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                name="status"
                defaultValue={company.status}
                disabled={!canEdit}
              >
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
                disabled={!canEdit}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade_name">Nome fantasia</Label>
              <Input
                id="trade_name"
                name="trade_name"
                defaultValue={company.trade_name}
                disabled={!canEdit}
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
                disabled={!canEdit}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={companyPhone}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="public_queue_slug">Slug publico</Label>
              <Input
                id="public_queue_slug"
                name="public_queue_slug"
                defaultValue={company.public_queue_slug}
                disabled={!canEdit}
                required
              />
            </div>
            {canEdit ? (
              <Button className="sm:col-span-2" type="submit">
                Salvar empresa
              </Button>
            ) : null}
          </form>
        </section>

        <aside className="rounded-lg border bg-card p-5 shadow-[var(--shadow-soft)]">
          <StatusBadge status={company.status} />
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            {company.corporate_name}
          </h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-muted-foreground">Criada em</span>
              <span>{formatDateTime(company.created_at)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-muted-foreground">Usuarios</span>
              <span>{profiles?.length ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-muted-foreground">Display</span>
              <span className="truncate font-mono text-xs">
                {company.public_queue_slug}
              </span>
            </div>
          </div>
        </aside>
      </div>

      <section className="mt-6 rounded-lg border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <UsersRound aria-hidden className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Usuarios do cliente
          </h2>
        </div>
        <div className="grid gap-3">
          {(profiles ?? []).map((profile) => (
            <div
              className="grid gap-4 rounded-lg border bg-background p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
              key={profile.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Avatar label={profile.email} name={profile.name} />
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={profile.role} />
                  <StatusBadge status={profile.status} />
                </div>
              </div>
              {canReset ? (
                <form
                  action={resetClientUserAccessAction}
                  className="flex flex-col gap-2 sm:flex-row"
                >
                  <input type="hidden" name="user_id" value={profile.user_id} />
                  <Input
                    className="sm:w-52"
                    name="password"
                    type="password"
                    minLength={8}
                    placeholder="Senha temporaria"
                    required
                  />
                  <Button type="submit" variant="outline">
                    <KeyRound aria-hidden className="h-4 w-4" />
                    Resetar
                  </Button>
                </form>
              ) : (
                <span className="text-sm text-muted-foreground">Somente leitura</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
