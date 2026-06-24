import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePlatformUser } from "@/lib/auth/platform-session";
import { canManageClientCompanies } from "@/lib/platform/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils";

export default async function PlatformCompaniesPage() {
  const { platformProfile } = await requirePlatformUser();
  const admin = createAdminClient();
  const { data: companies } = await admin
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Empresas Clientes"
        description="Tenants cadastrados na plataforma."
        action={
          canManageClientCompanies(platformProfile.role) ? (
            <Button asChild>
              <Link href="/platform/companies/new">
                <Plus aria-hidden className="h-4 w-4" />
                Nova empresa
              </Link>
            </Button>
          ) : null
        }
      />
      <section className="rounded-lg border bg-card shadow-[var(--shadow-soft)]">
        <div className="hidden grid-cols-12 gap-4 border-b px-5 py-3 text-xs font-semibold uppercase text-muted-foreground md:grid">
          <span className="col-span-5">Empresa</span>
          <span className="col-span-2 hidden lg:block">CNPJ</span>
          <span className="col-span-2 hidden md:block">Status</span>
          <span className="col-span-3 hidden md:block">Criacao</span>
        </div>
        <div className="divide-y">
          {(companies ?? []).map((company) => (
            <Link
              className="grid grid-cols-12 gap-4 px-4 py-4 transition-colors hover:bg-secondary/70 sm:px-5"
              href={`/platform/companies/${company.id}`}
              key={company.id}
            >
              <div className="col-span-12 flex items-center gap-3 md:col-span-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 aria-hidden className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {company.corporate_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {company.trade_name}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 md:hidden">
                    <StatusBadge status={company.status} />
                    <span className="font-mono text-xs text-muted-foreground">
                      {company.cnpj}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(company.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-span-2 hidden items-center font-mono text-sm text-muted-foreground lg:flex">
                {company.cnpj}
              </div>
              <div className="col-span-2 hidden items-center md:flex">
                <StatusBadge status={company.status} />
              </div>
              <div className="col-span-3 hidden items-center text-sm text-muted-foreground md:flex">
                {formatDateTime(company.created_at)}
              </div>
            </Link>
          ))}
        </div>
        {(companies ?? []).length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Building2}
              title="Nenhuma empresa cadastrada"
              description="Crie a primeira empresa cliente para iniciar a operacao."
            />
          </div>
        ) : null}
      </section>
    </>
  );
}
