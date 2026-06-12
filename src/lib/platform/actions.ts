"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  requirePlatformAdmin,
  requirePlatformOwner,
} from "@/lib/auth/platform-session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  platformCreateCompanySchema,
  platformCreateUserSchema,
  platformUpdateCompanySchema,
  platformUpdateUserSchema,
  resetClientUserAccessSchema,
} from "@/lib/validation";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createClientCompanyAction(formData: FormData) {
  await requirePlatformAdmin();

  const parsed = platformCreateCompanySchema.parse(formDataToObject(formData));
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

  const { data: createdUser, error: userError } =
    await admin.auth.admin.createUser({
      email: parsed.admin_email,
      password: parsed.admin_password,
      email_confirm: true,
      user_metadata: {
        name: parsed.admin_name,
        company_id: company.id,
      },
    });

  if (userError || !createdUser.user) {
    throw new Error(userError?.message ?? "Nao foi possivel criar o admin inicial.");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    user_id: createdUser.user.id,
    company_id: company.id,
    name: parsed.admin_name,
    email: parsed.admin_email,
    role: "admin",
    status: "active",
  });

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidatePath("/platform/companies");
  redirect(`/platform/companies/${company.id}`);
}

export async function updateClientCompanyAction(formData: FormData) {
  await requirePlatformAdmin();

  const parsed = platformUpdateCompanySchema.parse(formDataToObject(formData));
  const admin = createAdminClient();

  const { error } = await admin
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
    .eq("id", parsed.company_id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/platform/companies");
  revalidatePath(`/platform/companies/${parsed.company_id}`);
}

export async function createPlatformUserAction(formData: FormData) {
  await requirePlatformOwner();

  const parsed = platformCreateUserSchema.parse(formDataToObject(formData));
  const admin = createAdminClient();

  const { data: createdUser, error: userError } =
    await admin.auth.admin.createUser({
      email: parsed.email,
      password: parsed.password,
      email_confirm: true,
      user_metadata: {
        name: parsed.name,
        platform_role: parsed.role,
      },
    });

  if (userError || !createdUser.user) {
    throw new Error(userError?.message ?? "Nao foi possivel criar o usuario da plataforma.");
  }

  const { error: profileError } = await admin.from("platform_profiles").insert({
    user_id: createdUser.user.id,
    name: parsed.name,
    email: parsed.email,
    role: parsed.role,
    status: "active",
  });

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidatePath("/platform/users");
}

export async function updatePlatformUserAction(formData: FormData) {
  const { platformProfile } = await requirePlatformOwner();
  const parsed = platformUpdateUserSchema.parse(formDataToObject(formData));

  if (
    parsed.platform_profile_id === platformProfile.id &&
    parsed.status === "inactive"
  ) {
    throw new Error("O owner logado nao pode desativar o proprio acesso.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_profiles")
    .update({
      role: parsed.role,
      status: parsed.status,
    })
    .eq("id", parsed.platform_profile_id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/platform/users");
}

export async function resetClientUserAccessAction(formData: FormData) {
  await requirePlatformAdmin();

  const parsed = resetClientUserAccessSchema.parse(formDataToObject(formData));
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.updateUserById(parsed.user_id, {
    password: parsed.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/platform/companies");
}
