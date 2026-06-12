"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireProfile, requireUser } from "@/lib/auth/session";
import { getNotificationProvider } from "@/lib/notifications/get-notification-provider";
import { buildCustomerQueueLink } from "@/lib/queue/customer-link";
import { createQueueEntryForCurrentProfile } from "@/lib/queue/customer-queue-actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createUserSchema,
  onboardingSchema,
  queueStatusSchema,
  templateSchema,
  updateCompanySchema,
  updateUserSchema,
} from "@/lib/validation";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createCompanyOnboardingAction(formData: FormData) {
  const { user } = await requireUser();
  const parsed = onboardingSchema.parse(formDataToObject(formData));
  const admin = createAdminClient();

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      cnpj: parsed.cnpj,
      corporate_name: parsed.corporate_name,
      trade_name: parsed.trade_name,
      email: parsed.email,
      phone: parsed.phone || null,
      public_queue_slug: parsed.public_queue_slug,
      status: "active",
    })
    .select("*")
    .single();

  if (companyError) {
    throw new Error(companyError.message);
  }

  const { error: profileError } = await admin.from("profiles").insert({
    user_id: user.id,
    company_id: company.id,
    name: parsed.admin_name,
    email: user.email ?? parsed.email,
    role: "admin",
    status: "active",
  });

  if (profileError) {
    throw new Error(profileError.message);
  }

  redirect("/dashboard");
}

export async function updateCompanyAction(formData: FormData) {
  const { company } = await requireAdmin();
  const parsed = updateCompanySchema.parse(formDataToObject(formData));
  const supabase = await createClient();

  const { error } = await supabase
    .from("companies")
    .update({
      cnpj: parsed.cnpj,
      corporate_name: parsed.corporate_name,
      trade_name: parsed.trade_name,
      email: parsed.email,
      phone: parsed.phone || null,
      public_queue_slug: parsed.public_queue_slug,
      status: parsed.status,
    })
    .eq("id", company.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/companies");
  revalidatePath("/settings");
}

export async function createUserAction(formData: FormData) {
  const { company } = await requireAdmin();
  const parsed = createUserSchema.parse(formDataToObject(formData));
  const admin = createAdminClient();

  const { data: createdUser, error: userError } =
    await admin.auth.admin.createUser({
      email: parsed.email,
      password: parsed.password,
      email_confirm: true,
      user_metadata: {
        name: parsed.name,
      },
    });

  if (userError || !createdUser.user) {
    throw new Error(userError?.message ?? "Não foi possível criar o usuário.");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    user_id: createdUser.user.id,
    company_id: company.id,
    name: parsed.name,
    email: parsed.email,
    role: parsed.role,
    status: "active",
  });

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidatePath("/users");
}

export async function updateUserAction(formData: FormData) {
  const { company } = await requireAdmin();
  const parsed = updateUserSchema.parse(formDataToObject(formData));
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      role: parsed.role,
      status: parsed.status,
    })
    .eq("id", parsed.profile_id)
    .eq("company_id", company.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/users");
}

export async function upsertTemplateAction(formData: FormData) {
  const { company } = await requireAdmin();
  const parsed = templateSchema.parse(formDataToObject(formData));
  const supabase = await createClient();
  const isActive = parsed.active === "on";
  const payload = {
    company_id: company.id,
    type: parsed.type,
    title: parsed.title,
    content: parsed.content,
    active: isActive,
  };

  let templateId = parsed.template_id;

  if (!templateId) {
    const { data: existingTemplate, error: lookupError } = await supabase
      .from("message_templates")
      .select("id")
      .eq("company_id", company.id)
      .eq("type", parsed.type)
      .order("active", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      throw new Error(lookupError.message);
    }

    templateId = existingTemplate?.id ?? "";
  }

  if (isActive && templateId) {
    const { error: deactivateError } = await supabase
      .from("message_templates")
      .update({ active: false })
      .eq("company_id", company.id)
      .eq("type", parsed.type)
      .neq("id", templateId);

    if (deactivateError) {
      throw new Error(deactivateError.message);
    }
  }

  const query = templateId
    ? supabase
        .from("message_templates")
        .update(payload)
        .eq("id", templateId)
        .eq("company_id", company.id)
    : supabase.from("message_templates").insert(payload);

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/templates");
}

export async function createQueueEntryAction(formData: FormData) {
  await createQueueEntryForCurrentProfile(formData);
}

export async function releaseQueueEntryAction(formData: FormData) {
  const { company, profile } = await requireProfile();
  const parsed = queueStatusSchema.parse(formDataToObject(formData));
  const supabase = await createClient();

  const { data: queueEntry, error } = await supabase
    .from("queue_entries")
    .update({
      status: "released",
      released_by: profile.id,
      released_at: new Date().toISOString(),
      completed_at: null,
      cancelled_at: null,
      cancelled_by_customer: false,
    })
    .eq("id", parsed.queue_entry_id)
    .eq("company_id", company.id)
    .eq("status", "waiting")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!queueEntry) {
    revalidatePath("/operation");
    return;
  }

  await getNotificationProvider().sendCustomerReleasedMessage({
    company,
    queueEntry,
    customerLink: buildCustomerQueueLink(queueEntry.public_customer_token),
  });

  revalidatePath("/operation");
}

export async function completeQueueEntryAction(formData: FormData) {
  const { company } = await requireProfile();
  const parsed = queueStatusSchema.parse(formDataToObject(formData));
  const supabase = await createClient();

  const { error } = await supabase
    .from("queue_entries")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      cancelled_at: null,
    })
    .eq("id", parsed.queue_entry_id)
    .eq("company_id", company.id)
    .in("status", ["waiting", "released"]);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/operation");
}

export async function cancelQueueEntryAction(formData: FormData) {
  const { company } = await requireProfile();
  const parsed = queueStatusSchema.parse(formDataToObject(formData));
  const supabase = await createClient();

  const { error } = await supabase
    .from("queue_entries")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by_customer: false,
    })
    .eq("id", parsed.queue_entry_id)
    .eq("company_id", company.id)
    .in("status", ["waiting", "released"]);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/operation");
}
