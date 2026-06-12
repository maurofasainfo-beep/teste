import { PageHeader } from "@/components/layout/page-header";
import { OperationalBoard } from "@/components/queue/operational-board";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function OperationPage() {
  const { company, profile } = await requireProfile();
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("queue_entries")
    .select("*")
    .eq("company_id", company.id)
    .in("status", ["waiting", "released"])
    .order("position", { ascending: true, nullsFirst: false })
    .order("released_at", { ascending: false, nullsFirst: false });

  return (
    <>
      <PageHeader
        title="Operacao"
        description="Atendimento em tempo real com cards de fila e chamada."
        action={<StatusBadge status={profile.role} />}
      />
      <OperationalBoard companyId={company.id} initialEntries={entries ?? []} />
    </>
  );
}
