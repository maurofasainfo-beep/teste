import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  buildNotificationPayload,
  type NotificationContext,
  type NotificationProvider,
} from "./notification-provider";
import { renderNotificationMessage } from "./message-templates";
import type { MessageTemplateType } from "@/lib/types/database";

export class NoopNotificationProvider implements NotificationProvider {
  async sendQueueCreatedMessage(context: NotificationContext) {
    return this.record("queue_created", context);
  }

  async sendCustomerReleasedMessage(context: NotificationContext) {
    return this.record("customer_released", context);
  }

  private async record(type: MessageTemplateType, context: NotificationContext) {
    const supabase = await createClient();

    const { error } = await supabase.from("message_events").insert({
      company_id: context.company.id,
      queue_entry_id: context.queueEntry.id,
      provider: "none",
      type,
      payload: {
        ...buildNotificationPayload(type, context),
        message: await renderNotificationMessage(type, context),
      },
      status: "simulated",
    });

    return {
      provider: "none" as const,
      status: error ? ("failed" as const) : ("simulated" as const),
      errorMessage: error?.message,
    };
  }
}
