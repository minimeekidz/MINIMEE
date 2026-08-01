// Dispatches AI video jobs to the MINIMEE Make.com scenario, which fans out
// to HeyGen (learning_video) and Higgsfield (child_ai_video) and calls back
// ai-video-webhook when each job finishes. This runs from the Supabase
// backend, not the Claude MCP tool surface — Make holds its own HeyGen/
// Higgsfield credentials inside the scenario, this function only needs the
// Make webhook URL.

export type DispatchResult = { ok: true; providerJobId: string } | { ok: false; error: string };

export async function dispatchToMake(params: {
  jobId: string;
  videoType: "learning_video" | "child_ai_video";
  callbackUrl: string;
  input: Record<string, unknown>;
}): Promise<DispatchResult> {
  const webhookUrl = Deno.env.get("MAKE_AI_VIDEO_WEBHOOK_URL");
  if (!webhookUrl) {
    return { ok: false, error: "Make.com webhook is not configured (MAKE_AI_VIDEO_WEBHOOK_URL)" };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: params.jobId,
        video_type: params.videoType,
        callback_url: params.callbackUrl,
        input: params.input,
      }),
    });
    if (!response.ok) return { ok: false, error: `Make.com webhook responded ${response.status}` };
    return { ok: true, providerJobId: params.jobId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Best-effort parse of the callback the Make scenario sends to
// ai-video-webhook once its HeyGen/Higgsfield module finishes. Adjust the
// field names below once the scenario's actual outgoing webhook shape is
// built — this covers common naming, not a Make-specific guarantee.
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
