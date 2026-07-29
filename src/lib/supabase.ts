import { createClient, SupabaseClient } from "@supabase/supabase-js";

type PublicSupabaseConfig = {
  url?: string;
  publishableKey?: string;
};

export let supabase: SupabaseClient | null = null;

function makeClient(config: PublicSupabaseConfig) {
  const url = config.url?.trim();
  const publishableKey = config.publishableKey?.trim();
  if (!url || !publishableKey || !url.startsWith("https://")) return null;
  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export async function initializeSupabase() {
  if (supabase) return supabase;

  supabase = makeClient({
    url: import.meta.env.VITE_SUPABASE_URL,
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  });
  if (supabase) return supabase;

  try {
    const response = await fetch("/api/supabase-config", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    supabase = makeClient(await response.json() as PublicSupabaseConfig);
  } catch {
    return null;
  }
  return supabase;
}
