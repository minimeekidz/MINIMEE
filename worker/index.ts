export interface Env {
  ASSETS: Fetcher;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

const CONFIG_VERSION = "2026-07-31.1";

function supabaseConfigResponse(env: Env): Response {
  const url = env.VITE_SUPABASE_URL?.trim();
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    return Response.json(
      {
        error: "Supabase public configuration is unavailable.",
        configVersion: CONFIG_VERSION,
        missing: [
          !url && "VITE_SUPABASE_URL",
          !publishableKey && "VITE_SUPABASE_PUBLISHABLE_KEY",
        ].filter(Boolean),
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
