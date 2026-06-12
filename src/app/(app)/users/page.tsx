import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { UsersWorkspace } from "@/components/users/users-workspace";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function UsersPage() {
  const { company } = await requireAdmin();
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Equipe operacional e administrativa da empresa."
        action={<StatusBadge status={company.status} />}
      />
      <UsersWorkspace profiles={profiles ?? []} />
    </>
  );
}
