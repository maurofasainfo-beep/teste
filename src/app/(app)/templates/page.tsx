import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { TemplateWorkspace } from "@/components/templates/template-workspace";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { MessageTemplateType } from "@/lib/types/database";

const templateTypes: {
  value: MessageTemplateType;
  label: string;
  description: string;
}[] = [
  {
    value: "queue_created",
    label: "Cliente entrou na fila",
    description: "Mensagem registrada quando uma senha e criada.",
  },
  {
    value: "customer_released",
    label: "Cliente liberado",
    description: "Mensagem registrada quando o atendimento chama o cliente.",
  },
];

export default async function TemplatesPage() {
  const { company } = await requireAdmin();
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("message_templates")
    .select("*")
    .eq("company_id", company.id)
    .order("type")
    .order("active", { ascending: false })
    .order("updated_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Templates"
        description="Modelos preparados para mensageria futura."
        action={<StatusBadge status={company.status} />}
      />
      <TemplateWorkspace templateTypes={templateTypes} templates={templates ?? []} />
    </>
  );
}
