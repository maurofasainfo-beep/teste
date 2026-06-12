import type { MessageTemplateType } from "@/lib/types/database";

export const DEFAULT_MESSAGE_TEMPLATE_CONTENT: Record<MessageTemplateType, string> = {
  queue_created:
    "Ola {{nome_cliente}}, voce esta na posicao {{posicao_fila}} da fila da {{nome_empresa}}. Acompanhe: {{link_fila}}",
  customer_released:
    "{{nome_cliente}}, chegou sua vez! Compareca ao atendimento. Acompanhe: {{link_fila}}",
};
