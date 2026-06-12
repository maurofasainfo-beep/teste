import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { PlatformProfile } from "@/lib/types/database";

export type PlatformSessionContext = {
  user: User | null;
  platformProfile: PlatformProfile | null;
};

export async function getPlatformSessionContext(): Promise<PlatformSessionContext> {
  if (!isSupabaseConfigured()) {
    return { user: null, platformProfile: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, platformProfile: null };
  }

  const { data } = await supabase
    .from("platform_profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  return {
    user,
    platformProfile: data,
  };
}

export async function requirePlatformUser() {
  const context = await getPlatformSessionContext();

  if (!context.user) {
    redirect("/login");
  }

  if (!context.platformProfile) {
    redirect("/forbidden");
  }

  return context as PlatformSessionContext & {
    user: User;
    platformProfile: PlatformProfile;
  };
}

export async function requirePlatformAdmin() {
  const context = await requirePlatformUser();

  if (!["owner", "admin"].includes(context.platformProfile.role)) {
    redirect("/forbidden");
  }

  return context;
}

export async function requirePlatformOwner() {
  const context = await requirePlatformUser();

  if (context.platformProfile.role !== "owner") {
    redirect("/forbidden");
  }

  return context;
}

export async function getPostLoginRedirectPath() {
  if (!isSupabaseConfigured()) {
    return "/login";
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "/login";
  }

  const { data: platformProfile } = await supabase
    .from("platform_profiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (platformProfile) {
    return "/platform/dashboard";
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (profile) {
    return "/dashboard";
  }

  return "/onboarding";
}
