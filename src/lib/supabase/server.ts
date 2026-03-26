import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function isJwt(key: string | undefined): key is string {
  if (!key) return false;
  return key.startsWith("eyJ") && key.split(".").length === 3;
}

export function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const key = isJwt(serviceKey) ? serviceKey : isJwt(anonKey) ? anonKey : null;

  if (!url || !key) {
    console.warn(
      "[SUPABASE] Missing valid Supabase URL or JWT key — DB persistence disabled.",
      `URL=${url ? "set" : "MISSING"}, serviceKey=${serviceKey ? "set" : "MISSING"}(jwt=${isJwt(serviceKey)}), anonKey=${anonKey ? "set" : "MISSING"}(jwt=${isJwt(anonKey)})`,
    );
    return null;
  }

  if (!_client) {
    _client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return _client;
}
