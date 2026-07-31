// Dispatches to each AI video vendor's production REST API (not the Claude
// MCP tool surface — this runs in the Supabase backend with the operator's
// own provider API keys). Endpoint shapes below match each vendor's
// published API as of this integration; HeyGen's HyperFrames render
// endpoint is documented, but Higgsfield's video-generation application
// slug is not publicly confirmed — HIGGSFIELD_APPLICATION_SLUG must be
// verified against the operator's Higgsfield dashboard before going live,
// and the first real webhook delivery from each vendor should be inspected
// to confirm the payload shape parseProviderCallback() expects.

export type DispatchResult = { ok: true; providerJobId: string } | { ok: false; error: string };

export async function dispatchHeyGenRender(params: {
  callbackUrl: string;
  jobId: string;
  variables: Record<string, unknown>;
}): Promise<DispatchResult> {
  const apiKey = Deno.env.get("HEYGEN_API_KEY");
  const assetId = Deno.env.get("HEYGEN_HYPERFRAMES_ASSET_ID");
  if (!apiKey || !assetId) {
    return { ok: false, error: "HeyGen HyperFrames is not configured (HEYGEN_API_KEY / HEYGEN_HYPERFRAMES_ASSET_ID)" };
  }

  try {
    const response = await fetch("https://api.heygen.com/v3/hyperframes/renders", {
      method: "POST",
      headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        asset_id: assetId,
        variables: params.variables,
        callback_url: params.callbackUrl,
        callback_id: params.jobId,
      }),
    });
    if (!response.ok) return { ok: false, error: `HeyGen responded ${response.status}` };
    const data = await response.json();
    const renderId = data.render_id ?? data.id;
    if (!renderId) return { ok: false, error: "HeyGen response missing render_id" };
    return { ok: true, providerJobId: String(renderId) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function dispatchHiggsfieldJob(params: {
  callbackUrl: string;
  input: Record<string, unknown>;
}): Promise<DispatchResult> {
  const apiKey = Deno.env.get("HIGGSFIELD_API_KEY");
  const apiSecret = Deno.env.get("HIGGSFIELD_API_SECRET");
  const applicationSlug = Deno.env.get("HIGGSFIELD_APPLICATION_SLUG");
  if (!apiKey || !apiSecret || !applicationSlug) {
    return { ok: false, error: "Higgsfield is not configured (HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET / HIGGSFIELD_APPLICATION_SLUG)" };
  }

  try {
    const url = `https://platform.higgsfield.ai/${applicationSlug}?hf_webhook=${encodeURIComponent(params.callbackUrl)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Key ${apiKey}:${apiSecret}`, "Content-Type": "application/json" },
      body: JSON.stringify(params.input),
    });
    if (!response.ok) return { ok: false, error: `Higgsfield responded ${response.status}` };
    const data = await response.json();
    if (!data.request_id) return { ok: false, error: "Higgsfield response missing request_id" };
    return { ok: true, providerJobId: String(data.request_id) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Best-effort parse of a provider callback body into a common shape, since
// neither vendor's webhook payload is confirmed from primary sources yet.
// Verify against a real test delivery and tighten this once confirmed.
export function parseProviderCallback(body: Record<string, unknown>): {
  status: "completed" | "failed" | "processing" | "unknown";
  assetUrl: string | null;
} {
  const rawStatus = String(body.status ?? body.render_status ?? body.state ?? "").toLowerCase();
  const assetUrl = (body.video_url ?? body.url ?? body.output_url ?? body.asset_url ?? null) as string | null;

  if (["completed", "success", "succeeded", "done"].includes(rawStatus)) {
    return { status: "completed", assetUrl };
  }
  if (["failed", "error", "nsfw", "canceled", "cancelled"].includes(rawStatus)) {
    return { status: "failed", assetUrl: null };
  }
  if (["processing", "in_progress", "queued", "pending", "waiting"].includes(rawStatus)) {
    return { status: "processing", assetUrl: null };
  }
  return { status: "unknown", assetUrl };
}
