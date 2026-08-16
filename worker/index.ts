export interface Env {
  ASSETS: Fetcher;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

const CONFIG_VERSION = "2026-07-31.1";

function supabaseConfigResponse(env: Env): Response {
  const url = env.VITE_SUPABASE_URL?.trim();
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  // A value that is present but malformed fails exactly like a missing one on
  // the login form, and is fixed somewhere completely different — most often
  // the project ref got stored with the https:// left off. Reporting the shape
  // costs nothing (the URL is public) and turns a mystery into a one-liner.
  const problems = [
    !url && "VITE_SUPABASE_URL missing",
    !publishableKey && "VITE_SUPABASE_PUBLISHABLE_KEY missing",
    url && !url.startsWith("https://") && "VITE_SUPABASE_URL is not an https:// URL",
  ].filter(Boolean);

  if (problems.length > 0) {
    return Response.json(
      {
        error: "Supabase public configuration is unavailable.",
        configVersion: CONFIG_VERSION,
        missing: problems,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { url, publishableKey, configVersion: CONFIG_VERSION },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/supabase-config") {
      return supabaseConfigResponse(env);
    }

    return env.ASSETS.fetch(request);
  },
};
