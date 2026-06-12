"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireProfile } from "@/lib/auth/session";
import { getNotificationProvider } from "@/lib/notifications/get-notification-provider";
import { buildCustomerQueueLink } from "@/lib/queue/customer-link";
import { createClient } from "@/lib/supabase/server";
import {
  publicCustomerTokenSchema,
  queueEntrySchema,
  queueSettingsSchema,
} from "@/lib/validation";

export type CreateQueueEntryActionState = {
  status: "idle" | "success" | "error";
  message: string;
  ticketCode?: string;
  customerLink?: string;
  customerName?: string;
  partySize?: number;
};

export type LeaveQueueActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Nao foi possivel concluir a acao.";
}

export async function createQueueEntryForCurrentProfile(formData: FormData) {
  const { company, profile } = await requireProfile();
  const parsed = queueEntrySchema.parse(formDataToObject(formData));
  const supabase = await createClient();

  const { data: queueEntry, error } = await supabase
    .from("queue_entries")
    .insert({
      company_id: company.id,
      customer_name: parsed.customer_name,
      customer_phone: parsed.customer_phone,
      party_size: parsed.party_size,
      created_by: profile.id,
      status: "waiting",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const customerLink = buildCustomerQueueLink(queueEntry.public_customer_token);

  await getNotificationProvider().sendQueueCreatedMessage({
    company,
    queueEntry,
    customerLink,
  });

  revalidatePath("/operation");
  revalidatePath("/dashboard");

  return {
    queueEntry,
    customerLink,
  };
}

export async function createQueueEntryWithLinkAction(
  _previousState: CreateQueueEntryActionState,
  formData: FormData,
): Promise<CreateQueueEntryActionState> {
  try {
    const { queueEntry, customerLink } =
      await createQueueEntryForCurrentProfile(formData);

    return {
      status: "success",
      message: "Cliente cadastrado com sucesso.",
      ticketCode: queueEntry.ticket_code,
      customerLink,
      customerName: queueEntry.customer_name,
      partySize: queueEntry.party_size,
    };
  } catch (error) {
    return {
      status: "error",
      message: getErrorMessage(error),
    };
  }
}

export async function leaveCustomerQueueAction(
  _previousState: LeaveQueueActionState,
  formData: FormData,
): Promise<LeaveQueueActionState> {
  try {
    const parsed = publicCustomerTokenSchema.parse(formDataToObject(formData));
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "cancel_public_customer_queue_entry",
      {
        customer_token: parsed.customer_token,
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.[0]) {
      return {
        status: "error",
        message: "Nao e possivel sair da fila neste status.",
      };
    }

    revalidatePath(`/queue/customer/${parsed.customer_token}`);
    revalidatePath("/operation");
    revalidatePath("/dashboard");

    return {
      status: "success",
      message: "Voce saiu da fila.",
    };
  } catch (error) {
    return {
      status: "error",
      message: getErrorMessage(error),
    };
  }
}

export async function updateQueueSettingsAction(formData: FormData) {
  const { company } = await requireAdmin();
  const parsed = queueSettingsSchema.parse(formDataToObject(formData));
  const supabase = await createClient();

  const { error } = await supabase.from("company_settings").upsert(
    {
      company_id: company.id,
      released_link_expiration_minutes:
        parsed.released_link_expiration_minutes,
    },
    { onConflict: "company_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}
