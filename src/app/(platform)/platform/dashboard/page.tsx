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
    </>
  );
}
