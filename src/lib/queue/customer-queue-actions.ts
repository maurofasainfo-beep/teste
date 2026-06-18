"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireProfile } from "@/lib/auth/session";
import { getNotificationProvider } from "@/lib/notifications/get-notification-provider";
import {
  getPublicPageBackgroundPath,
  PUBLIC_PAGE_ASSET_BUCKET,
  PUBLIC_PAGE_IMAGE_MAX_BYTES,
  PUBLIC_PAGE_IMAGE_MIME_TYPES,
} from "@/lib/public-page-branding";
import { buildCustomerQueueLink } from "@/lib/queue/customer-link";
import { createClient } from "@/lib/supabase/server";
import {
  publicPageBrandingSchema,
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

export type PublicPageBrandingActionState = {
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
      estimated_wait_enabled: parsed.estimated_wait_enabled,
      estimated_wait_default_minutes: parsed.estimated_wait_default_minutes,
      estimated_wait_sample_size: parsed.estimated_wait_sample_size,
      estimated_wait_margin_percent: parsed.estimated_wait_margin_percent,
    },
    { onConflict: "company_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}

export async function updatePublicPageBrandingAction(
  _previousState: PublicPageBrandingActionState,
  formData: FormData,
): Promise<PublicPageBrandingActionState> {
  try {
    const { company } = await requireAdmin();
    const parsed = publicPageBrandingSchema.safeParse(formDataToObject(formData));

    if (!parsed.success) {
      return {
        status: "error",
        message: parsed.error.issues[0]?.message ?? "Revise as cores informadas.",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("company_settings").upsert(
      {
        company_id: company.id,
        ...parsed.data,
      },
      { onConflict: "company_id" },
    );

    if (error) throw new Error(error.message);

    revalidatePublicBranding();
    return { status: "success", message: "Aparencia salva com sucesso." };
  } catch (error) {
    return { status: "error", message: getErrorMessage(error) };
  }
}

export async function uploadPublicPageBackgroundAction(
  _previousState: PublicPageBrandingActionState,
  formData: FormData,
): Promise<PublicPageBrandingActionState> {
  try {
    const { company } = await requireAdmin();
    const image = formData.get("position_card_background");

    if (!(image instanceof File) || image.size === 0) {
      return { status: "error", message: "Selecione uma imagem para enviar." };
    }

    if (image.size > PUBLIC_PAGE_IMAGE_MAX_BYTES) {
      return { status: "error", message: "A imagem deve ter no maximo 2 MB." };
    }

    if (!PUBLIC_PAGE_IMAGE_MIME_TYPES.some((type) => type === image.type)) {
      return { status: "error", message: "Use uma imagem JPG, PNG ou WebP." };
    }

    if (!(await hasValidImageSignature(image))) {
      return {
        status: "error",
        message: "O conteudo do arquivo nao corresponde a uma imagem valida.",
      };
    }

    const supabase = await createClient();
    const path = getPublicPageBackgroundPath(company.id);
    const { error: uploadError } = await supabase.storage
      .from(PUBLIC_PAGE_ASSET_BUCKET)
      .upload(path, image, {
        cacheControl: "3600",
        contentType: image.type,
        upsert: true,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage
      .from(PUBLIC_PAGE_ASSET_BUCKET)
      .getPublicUrl(path, { cacheNonce: Date.now().toString() });
    const { error: settingsError } = await supabase.from("company_settings").upsert(
      {
        company_id: company.id,
        public_page_position_card_background_url: data.publicUrl,
      },
      { onConflict: "company_id" },
    );

    if (settingsError) throw new Error(settingsError.message);

    revalidatePublicBranding();
    return { status: "success", message: "Imagem atualizada com sucesso." };
  } catch (error) {
    return { status: "error", message: getErrorMessage(error) };
  }
}

export async function removePublicPageBackgroundAction(
  previousState: PublicPageBrandingActionState,
  formData: FormData,
): Promise<PublicPageBrandingActionState> {
  void previousState;
  void formData;

  try {
    const { company } = await requireAdmin();
    const supabase = await createClient();
    const path = getPublicPageBackgroundPath(company.id);
    const { error: removeError } = await supabase.storage
      .from(PUBLIC_PAGE_ASSET_BUCKET)
      .remove([path]);

    if (removeError) throw new Error(removeError.message);

    const { error: settingsError } = await supabase.from("company_settings").upsert(
      {
        company_id: company.id,
        public_page_position_card_background_url: null,
      },
      { onConflict: "company_id" },
    );

    if (settingsError) throw new Error(settingsError.message);

    revalidatePublicBranding();
    return { status: "success", message: "Imagem removida com sucesso." };
  } catch (error) {
    return { status: "error", message: getErrorMessage(error) };
  }
}

function revalidatePublicBranding() {
  revalidatePath("/settings");
  revalidatePath("/queue/customer/[token]", "page");
}

async function hasValidImageSignature(image: File) {
  const bytes = new Uint8Array(await image.slice(0, 12).arrayBuffer());

  if (image.type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (image.type === "image/png") {
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return pngSignature.every((value, index) => bytes[index] === value);
  }

  if (image.type === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}
