import { Building2, ListChecks, Shield, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePlatformUser } from "@/lib/auth/platform-session";
import { createAdminClient } from "@/lib/supabase/admin";

const metrics = [
  { key: "companies", label: "Empresas", icon: Building2, tone: "primary" },
  { key: "users", label: "Usuarios clientes", icon: Users, tone: "neutral" },
  { key: "activeQueues", label: "Filas ativas", icon: ListChecks, tone: "success" },
  { key: "platformUsers", label: "Equipe plataforma", icon: Shield, tone: "warning" },
] as const;

export default async function PlatformDashboardPage() {
  const { platformProfile } = await requirePlatformUser();
  const admin = createAdminClient();

  const [companies, users, activeQueues, platformUsers] = await Promise.all([
    admin.from("companies").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("queue_entries")
      .select("id", { count: "exact", head: true })
      .in("status", ["waiting", "released"]),
    admin
      .from("platform_profiles")
      .select("id", { count: "exact", head: true }),
  ]);

  const values = {
    companies: companies.count ?? 0,
    users: users.count ?? 0,
    activeQueues: activeQueues.count ?? 0,
    platformUsers: platformUsers.count ?? 0,
  };

  return (
    <>
      <PageHeader
        title="Dashboard da Plataforma"
        description={`Visao global para ${platformProfile.name}.`}
        action={<StatusBadge status={platformProfile.role} />}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard
            detail="Visao administrativa global"
            icon={metric.icon}
            key={metric.key}
            label={metric.label}
            tone={metric.tone}
            value={values[metric.key]}
          />
        ))}
      </div>
      <section className="mt-6 rounded-lg border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3 text-primary">
            <Shield aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Administracao separada dos tenants
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              A plataforma usa service role apenas no servidor depois de validar
              o usuario em platform_profiles. Os usuarios clientes continuam
              isolados por company_id e RLS.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
