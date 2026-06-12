import "server-only";

import { createClient } from "@/lib/supabase/server";
import { buildMessagePayload, type MessageContext, type MessageProvider } from "./provider";
import type { MessageTemplateType } from "@/lib/types/database";

export class NoopMessageProvider implements MessageProvider {
  async sendQueueCreatedMessage(context: MessageContext) {
    return this.record("queue_created", context);
  }

  async sendCustomerReleasedMessage(context: MessageContext) {
    return this.record("customer_released", context);
  }

  private async record(type: MessageTemplateType, context: MessageContext) {
    const supabase = await createClient();

    const { error } = await supabase.from("message_events").insert({
      company_id: context.company.id,
      queue_entry_id: context.queueEntry.id,
      provider: "none",
      type,
      payload: buildMessagePayload(type, context),
      status: "recorded",
    });

    return {
      provider: "none" as const,
      status: error ? ("failed" as const) : ("recorded" as const),
      errorMessage: error?.message,
    };
  }
}

export function getMessageProvider() {
  return new NoopMessageProvider();
}
