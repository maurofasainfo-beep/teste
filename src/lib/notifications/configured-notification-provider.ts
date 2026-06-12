import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  buildNotificationPayload,
  type NotificationContext,
  type NotificationProvider,
  type NotificationProviderResult,
} from "./notification-provider";
import { renderNotificationMessage } from "./message-templates";
import { ExtensionWhatsAppProvider } from "./extension-whatsapp-provider";
import { NoopNotificationProvider } from "./noop-notification-provider";
import type { MessageTemplateType, NotificationChannel } from "@/lib/types/database";

class DisabledNotificationProvider implements NotificationProvider {
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
      channel: "whatsapp",
      type,
      payload: {
        ...buildNotificationPayload(type, context),
        message: await renderNotificationMessage(type, context),
      },
      status: "skipped",
    });

    return {
      provider: "none" as const,
      status: error ? ("failed" as const) : ("skipped" as const),
      errorMessage: error?.message,
    };
  }
}

export class ConfiguredNotificationProvider implements NotificationProvider {
  async sendQueueCreatedMessage(
    context: NotificationContext,
  ): Promise<NotificationProviderResult> {
    const provider = await this.getProvider(context);
    return provider.sendQueueCreatedMessage(context);
  }

  async sendCustomerReleasedMessage(
    context: NotificationContext,
  ): Promise<NotificationProviderResult> {
    const provider = await this.getProvider(context);
    return provider.sendCustomerReleasedMessage(context);
  }

  private async getProvider(
    context: NotificationContext,
  ): Promise<NotificationProvider> {
    const channel = await this.getNotificationChannel(context.company.id);

    if (channel === "none") {
      return new DisabledNotificationProvider();
    }

    if (channel === "whatsapp_extension") {
      return new ExtensionWhatsAppProvider();
    }

    return new NoopNotificationProvider();
  }

  private async getNotificationChannel(companyId: string): Promise<NotificationChannel> {
    const supabase = await createClient();
    const { data } = await supabase
      .from("company_settings")
      .select("notification_channel")
      .eq("company_id", companyId)
      .maybeSingle();

    return data?.notification_channel ?? "simulated";
  }
}
