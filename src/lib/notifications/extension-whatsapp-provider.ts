import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  buildNotificationPayload,
  type NotificationContext,
  type NotificationProvider,
} from "./notification-provider";
import { renderNotificationMessage } from "./message-templates";
import type { MessageTemplateType } from "@/lib/types/database";

function buildIdempotencyKey(type: MessageTemplateType, context: NotificationContext) {
  return [
    context.company.id,
    context.queueEntry.id,
    type,
    context.queueEntry.status,
    type === "customer_released" ? context.queueEntry.released_at ?? "" : "",
  ].join(":");
}

export class ExtensionWhatsAppProvider implements NotificationProvider {
  async sendQueueCreatedMessage(context: NotificationContext) {
    return this.record("queue_created", context);
  }

  async sendCustomerReleasedMessage(context: NotificationContext) {
    return this.record("customer_released", context);
  }

  private async record(type: MessageTemplateType, context: NotificationContext) {
    const supabase = await createClient();
    const payload = {
      ...buildNotificationPayload(type, context),
      message: await renderNotificationMessage(type, context),
    };

    const { error } = await supabase.from("message_events").insert({
      company_id: context.company.id,
      queue_entry_id: context.queueEntry.id,
      provider: "whatsapp_extension",
      channel: "whatsapp",
      type,
      payload,
      status: "pending",
      idempotency_key: buildIdempotencyKey(type, context),
      max_attempts: 3,
    });

    return {
      provider: "whatsapp_extension" as const,
      status: error ? ("failed" as const) : ("pending" as const),
      errorMessage: error?.message,
    };
  }
}
