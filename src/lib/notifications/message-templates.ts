import "server-only";

import { DEFAULT_MESSAGE_TEMPLATE_CONTENT } from "@/lib/message-template-defaults";
import { normalizeBrazilianPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  MessageTemplate,
  MessageTemplateType,
} from "@/lib/types/database";
import type { NotificationContext } from "./notification-provider";

type TemplateVariables = Record<string, string>;

export function renderMessageTemplate(
  templateContent: string,
  variables: TemplateVariables,
) {
  return templateContent.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    const value = variables[key];
    return value === undefined ? match : value;
  });
}

export async function getCompanyMessageTemplate(
  companyId: string,
  type: MessageTemplateType,
): Promise<MessageTemplate | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("message_templates")
    .select("*")
    .eq("company_id", companyId)
    .eq("type", type)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0] ?? null;
}

export function buildTemplateVariables(context: NotificationContext) {
  return {
    nome_cliente: context.queueEntry.customer_name,
    telefone_cliente: normalizeBrazilianPhone(context.queueEntry.customer_phone),
    nome_empresa: context.company.trade_name,
    codigo_senha: context.queueEntry.ticket_code,
    link_fila: context.customerLink,
    quantidade_pessoas: String(context.queueEntry.party_size ?? 1),
    posicao_fila: context.queueEntry.position
      ? String(context.queueEntry.position)
      : "atendimento",
  };
}

export async function renderNotificationMessage(
  type: MessageTemplateType,
  context: NotificationContext,
) {
  const template = await getCompanyMessageTemplate(context.company.id, type);
  const variables = buildTemplateVariables(context);

  return renderMessageTemplate(
    template?.content ?? DEFAULT_MESSAGE_TEMPLATE_CONTENT[type],
    variables,
  );
}
