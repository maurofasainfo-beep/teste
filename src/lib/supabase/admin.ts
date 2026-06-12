import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getRequiredSupabaseServiceConfig } from "@/lib/env";
import type { Database } from "@/lib/types/database";

export function createAdminClient() {
  const { url, serviceKey } = getRequiredSupabaseServiceConfig();

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
