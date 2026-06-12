import { LiveDashboard } from "@/components/dashboard/live-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { QueueEntryStatus } from "@/lib/types/database";

const statuses = ["waiting", "released", "completed", "cancelled"] as const;

export default async function DashboardPage() {
  const { company, profile } = await requireProfile();
  const supabase = await createClient();

  const counts = await Promise.all(
    statuses.map(async (status) => {
      const { count } = await supabase
        .from("queue_entries")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("status", status);

      return [status, count ?? 0] as const;
    }),
  );

  const { data: recentEntries } = await supabase
    .from("queue_entries")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Operacao da empresa ${company.trade_name}.`}
        action={<StatusBadge status={profile.role} />}
      />
      <LiveDashboard
        companyId={company.id}
        initialMetrics={Object.fromEntries(counts) as Record<QueueEntryStatus, number>}
        initialRecentEntries={recentEntries ?? []}
      />
    </>
  );
}
