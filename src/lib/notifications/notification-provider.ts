import type {
  Company,
  MessageEventStatus,
  MessageProviderName,
  MessageTemplateType,
  QueueEntry,
} from "@/lib/types/database";
import { normalizeBrazilianPhone } from "@/lib/phone";

export type NotificationContext = {
  company: Company;
  queueEntry: QueueEntry;
  customerLink: string;
};

export type NotificationProviderResult = {
  provider: MessageProviderName;
  status: Extract<
    MessageEventStatus,
    "pending" | "simulated" | "skipped" | "sent" | "failed"
  >;
  errorMessage?: string;
};

export interface NotificationProvider {
  sendQueueCreatedMessage(
    context: NotificationContext,
  ): Promise<NotificationProviderResult>;
  sendCustomerReleasedMessage(
    context: NotificationContext,
  ): Promise<NotificationProviderResult>;
}

export function buildNotificationPayload(
  type: MessageTemplateType,
  context: NotificationContext,
) {
  const recipientPhone = normalizeBrazilianPhone(context.queueEntry.customer_phone);
  const variables = {
    nome_cliente: context.queueEntry.customer_name,
    telefone_cliente: recipientPhone,
    nome_empresa: context.company.trade_name,
    codigo_senha: context.queueEntry.ticket_code,
    link_fila: context.customerLink,
    quantidade_pessoas: String(context.queueEntry.party_size ?? 1),
    posicao_fila: context.queueEntry.position
      ? String(context.queueEntry.position)
      : "atendimento",
  };
  const basePayload = {
    type,
    variables,
    customer_name: context.queueEntry.customer_name,
    customer_phone: recipientPhone,
    recipient_phone: recipientPhone,
    ticket_code: context.queueEntry.ticket_code,
    party_size: context.queueEntry.party_size,
    position: context.queueEntry.position,
    customer_link: context.customerLink,
    company_name: context.company.trade_name,
  };

  if (type === "customer_released") {
    return {
      ...basePayload,
      released_at: context.queueEntry.released_at,
    };
  }

  return basePayload;
}
