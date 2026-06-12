export function getSupabasePublicConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function getSupabaseServiceKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY
  );
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabasePublicConfig();
  return Boolean(url && anonKey);
}

export function getRequiredSupabasePublicConfig() {
  const config = getSupabasePublicConfig();

  if (!config.url || !config.anonKey) {
    throw new Error(
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return {
    url: config.url,
    anonKey: config.anonKey,
  };
}

export function getRequiredSupabaseServiceConfig() {
  const publicConfig = getRequiredSupabasePublicConfig();
  const serviceKey = getSupabaseServiceKey();

  if (!serviceKey) {
    throw new Error(
      "Service Role Key não configurada. Defina SUPABASE_SERVICE_ROLE_KEY apenas no servidor.",
    );
  }

  return {
    ...publicConfig,
    serviceKey,
  };
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
