import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Connecting the browser to Supabase, and — just as important — being able to
// say why it did not.
//
// The public URL and publishable key reach the browser two ways, and both are
// wired on purpose:
//
//   1. baked into the bundle at build time (`import.meta.env.VITE_…`)
//   2. fetched at run time from the Worker's own secrets (`/api/supabase-config`)
//
// It used to be route 2 only. That is one point of failure for the entire
// site — if the Worker's secrets are missing, wrong, or the endpoint 503s, a
// parent gets 「Supabase環境變數尚未載入」 on the login form and there is
// nothing in the page to say which of those it was. Route 1 costs nothing (the
// values are public by design — RLS is what protects the data, not secrecy)
// and it keeps working when the endpoint does not.
//
// When both routes fail, `supabaseSetupError` says what was actually wrong so
// the screen can print it instead of asking somebody to redeploy and hope.

type PublicSupabaseConfig = {
  url?: string;
  publishableKey?: string;
};

export let supabase: SupabaseClient | null = null;

/** Why there is no client, in words a person can act on. Null once connected. */
export let supabaseSetupError: string | null = null;

/**
 * What is wrong with a pair of values, or null when they are usable.
 *
 * Split out because the two failures look identical from the login form and
 * are fixed in completely different places: a missing value is a secret that
 * was never set, and a malformed URL is a secret that was set to the wrong
 * thing — most often the project ref with the `https://` left off.
 */
export function configProblem(config: PublicSupabaseConfig): string | null {
  const url = config.url?.trim();
  const key = config.publishableKey?.trim();
  const missing = [!url && "URL", !key && "publishable key"].filter(Boolean);
  if (missing.length > 0) return `Supabase ${missing.join(" 同 ")} 未設定`;
  if (!url!.startsWith("https://")) {
    return `Supabase URL 格式唔啱（要 https:// 開頭，而家係 "${url!.slice(0, 12)}…"）`;
  }
  return null;
}

function makeClient(config: PublicSupabaseConfig): SupabaseClient | null {
  if (configProblem(config)) return null;
  return createClient(config.url!.trim(), config.publishableKey!.trim(), {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export async function initializeSupabase() {
  if (supabase) return supabase;

  const baked: PublicSupabaseConfig = {
    url: import.meta.env.VITE_SUPABASE_URL,
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
  supabase = makeClient(baked);
  if (supabase) { supabaseSetupError = null; return supabase; }
  const bakedProblem = configProblem(baked);

  try {
    const response = await fetch("/api/supabase-config", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await response.json().catch(() => null) as
      (PublicSupabaseConfig & { missing?: string[] }) | null;

    if (!response.ok) {
      supabaseSetupError = body?.missing?.length
        ? `Worker 未有 ${body.missing.join(" 同 ")}（/api/supabase-config 回 ${response.status}）`
        : `/api/supabase-config 回 ${response.status}`;
      return null;
    }

    supabase = makeClient(body ?? {});
    supabaseSetupError = supabase ? null
      : configProblem(body ?? {}) ?? bakedProblem;
  } catch (error) {
    supabaseSetupError =
      `連唔到 /api/supabase-config（${error instanceof Error ? error.message : "網絡錯誤"}）`;
  }
  return supabase;
}
