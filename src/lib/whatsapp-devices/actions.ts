"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { generateDeviceCredentials } from "@/lib/qwep/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createWhatsAppDeviceSchema,
  notificationChannelSchema,
  whatsappDeviceIdSchema,
} from "@/lib/validation";

export type CreateWhatsAppDeviceActionState = {
  status: "idle" | "success" | "error";
  message: string;
  token?: string;
  signingSecret?: string;
  deviceName?: string;
};

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Nao foi possivel concluir.";
}

export async function createWhatsAppDeviceAction(
  _previousState: CreateWhatsAppDeviceActionState,
  formData: FormData,
): Promise<CreateWhatsAppDeviceActionState> {
  try {
    const { company, user } = await requireAdmin();
    const parsed = createWhatsAppDeviceSchema.parse(formDataToObject(formData));
    const credentials = generateDeviceCredentials();
    const admin = createAdminClient();

    const { data: existingPrimary } = await admin
      .from("whatsapp_devices")
      .select("id")
      .eq("company_id", company.id)
      .eq("is_primary_sender", true)
      .neq("status", "revoked")
      .maybeSingle();

    const { data: device, error } = await admin
      .from("whatsapp_devices")
      .insert({
        company_id: company.id,
        name: parsed.name,
        token_hash: credentials.tokenHash,
        signing_secret_hash: credentials.signingSecretHash,
        signing_secret_encrypted: credentials.signingSecretEncrypted,
        status: "pending_activation",
        is_primary_sender: !existingPrimary,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await admin.from("whatsapp_device_logs").insert({
      company_id: company.id,
      device_id: device.id,
      event_type: "device_created",
      message: "Dispositivo criado. Token exibido uma unica vez.",
    });

    revalidatePath("/settings");

    return {
      status: "success",
      message: "Dispositivo criado. Copie as credenciais agora.",
      token: credentials.token,
      signingSecret: credentials.signingSecret,
      deviceName: parsed.name,
    };
  } catch (error) {
    return {
      status: "error",
      message: getErrorMessage(error),
    };
  }
}

export async function revokeWhatsAppDeviceAction(formData: FormData) {
  await requireAdmin();
  const parsed = whatsappDeviceIdSchema.parse(formDataToObject(formData));
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_whatsapp_device", {
    target_device_id: parsed.device_id,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}

export async function setPrimaryWhatsAppDeviceAction(formData: FormData) {
  await requireAdmin();
  const parsed = whatsappDeviceIdSchema.parse(formDataToObject(formData));
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_primary_whatsapp_device", {
    target_device_id: parsed.device_id,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}

export async function updateNotificationChannelAction(formData: FormData) {
  const { company } = await requireAdmin();
  const parsed = notificationChannelSchema.parse(formDataToObject(formData));
  const supabase = await createClient();

  const { error } = await supabase.from("company_settings").upsert(
    {
      company_id: company.id,
      notification_channel: parsed.notification_channel,
    },
    { onConflict: "company_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}

