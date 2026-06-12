import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Company, Profile } from "@/lib/types/database";

export type SessionContext = {
  user: User | null;
  profile: Profile | null;
  company: Company | null;
};

export async function getSessionContext(): Promise<SessionContext> {
  if (!isSupabaseConfigured()) {
    return { user: null, profile: null, company: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null, company: null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*, company:companies(*)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return { user, profile: null, company: null };
  }

  const profileWithCompany = data as Profile & { company: Company | null };

  return {
    user,
    profile: profileWithCompany,
    company: profileWithCompany.company,
  };
}

export async function requireUser() {
  const context = await getSessionContext();

  if (!context.user) {
    redirect("/login");
  }

  return context as SessionContext & { user: User };
}

export async function requireProfile() {
  const context = await requireUser();

  if (!context.profile || !context.company) {
    redirect("/onboarding");
  }

  if (context.profile.status !== "active" || context.company.status !== "active") {
    redirect("/forbidden");
  }

  return context as SessionContext & {
    user: User;
    profile: Profile;
    company: Company;
  };
}

export async function requireAdmin() {
  const context = await requireProfile();

  if (context.profile.role !== "admin") {
    redirect("/forbidden");
  }

  return context;
}
