import { getSupabaseAdmin } from "../_shared/clients.ts";
import { parseProviderCallback } from "../_shared/providers.ts";

const FAILURE_MESSAGE = "AI 影片製作遇到問題，我們已經記錄低呢次嘗試，會盡快人手處理，唔會扣減你嘅主題權益。";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const jobId = new URL(req.url).searchParams.get("job_id");
  if (!jobId) return new Response("Missing job_id", { status: 400 });

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: job, error: jobError } = await admin
    .from("ai_video_jobs")
    .select("id, parent_id, entitlement_id, video_type, status")
    .eq("id", jobId)
    .maybeSingle();
  if (jobError) return new Response("Failed to look up job", { status: 500 });
  if (!job) return new Response("Unknown job", { status: 404 });
  if (job.status === "completed" || job.status === "failed") {
    return new Response(JSON.stringify({ received: true, alreadyFinal: true }), { status: 200 });
  }

  const parsed = parseProviderCallback(payload);

  if (parsed.status === "completed") {
    await admin
      .from("ai_video_jobs")
      .update({ status: "completed", asset_url: parsed.assetUrl })
      .eq("id", jobId);

    const { data: siblingJobs } = await admin
      .from("ai_video_jobs")
      .select("status")
      .eq("entitlement_id", job.entitlement_id);
    const allDone = (siblingJobs ?? []).length > 0 && (siblingJobs ?? []).every((row) => row.status === "completed");
    if (allDone) {
      await admin
        .from("theme_entitlements")
        .update({ status: "consumed", consumed_at: new Date().toISOString() })
        .eq("id", job.entitlement_id);
    }
  } else if (parsed.status === "failed") {
    await admin
      .from("ai_video_jobs")
      .update({
        status: "failed",
        customer_message: FAILURE_MESSAGE,
        error_detail: payload,
      })
      .eq("id", jobId);

    await admin.from("admin_alerts").insert({
      category: "ai_production",
      message: `AI video job ${job.video_type} failed via provider callback`,
      context: { job_id: jobId, provider_payload: payload },
    });

    await admin.from("notifications").insert({
      parent_id: job.parent_id,
      notification_type: "ai_job_failed",
      title: "AI 影片製作遇到問題",
      body: FAILURE_MESSAGE,
    });
  } else {
    await admin.from("ai_video_jobs").update({ status: "processing" }).eq("id", jobId);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
