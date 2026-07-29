interface Env {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

const configVersion = "2026-07-30.1";

// Pages Functions read these public client values from the deployment environment.
export const onRequestGet = async ({ env }: { env: Env }) => {
  const url = env.VITE_SUPABASE_URL?.trim();
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    return Response.json(
      {
        error: "Supabase public configuration is unavailable.",
        configVersion,
        missing: [
          !url && "VITE_SUPABASE_URL",
          !publishableKey && "VITE_SUPABASE_PUBLISHABLE_KEY",
        ].filter(Boolean),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { url, publishableKey, configVersion },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
};
