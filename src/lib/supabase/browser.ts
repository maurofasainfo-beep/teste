"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getRequiredSupabasePublicConfig } from "@/lib/env";
import type { Database } from "@/lib/types/database";

export function createClient() {
  const { url, anonKey } = getRequiredSupabasePublicConfig();
  return createBrowserClient<Database>(url, anonKey);
}
