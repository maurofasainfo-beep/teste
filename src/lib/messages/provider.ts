import type {
  Company,
  MessageTemplateType,
  QueueEntry,
} from "@/lib/types/database";
import { normalizeBrazilianPhone } from "@/lib/phone";

export type MessageContext = {
  company: Company;
  queueEntry: QueueEntry;
  publicQueueUrl: string;
};

export type MessageProviderResult = {
  provider: "none" | "evolution_api";
  status: "recorded" | "sent" | "failed";
  errorMessage?: string;
};

export interface MessageProvider {
  sendQueueCreatedMessage(
    context: MessageContext,
  ): Promise<MessageProviderResult>;
  sendCustomerReleasedMessage(
    context: MessageContext,
  ): Promise<MessageProviderResult>;
}

export function buildMessagePayload(
  type: MessageTemplateType,
  context: MessageContext,
) {
  return {
    type,
      variables: {
        nome_cliente: context.queueEntry.customer_name,
        telefone_cliente: normalizeBrazilianPhone(context.queueEntry.customer_phone),
        nome_empresa: context.company.trade_name,
      codigo_senha: context.queueEntry.ticket_code,
      link_fila: context.publicQueueUrl,
    },
  };
}
