import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin, getSupabaseForRequest } from "../_shared/clients.ts";
import { themeReleaseAt } from "../_shared/release.ts";
import { dispatchHeyGenRender, dispatchHiggsfieldJob } from "../_shared/providers.ts";

const FAILURE_MESSAGE = "AI 影片製作遇到問題，我們已經記錄低呢次嘗試，會盡快人手處理，唔會扣減你嘅主題權益。";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const userClient = getSupabaseForRequest(req);
  const { data: userData, error: authError } = await userClient.auth.getUser();
  if (authError || !userData?.user) return jsonResponse({ error: "Not authenticated" }, 401);
  const user = userData.user;

  let body: { entitlementId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  if (!body.entitlementId) return jsonResponse({ error: "entitlementId is required" }, 400);

  const admin = getSupabaseAdmin();

  const { data: entitlement, error: entitlementError } = await admin
    .from("theme_entitlements")
    .select("id, parent_id, child_id, subscription_id, sequence_number, status")
    .eq("id", body.entitlementId)
    .eq("parent_id", user.id)
    .maybeSingle();
  if (entitlementError) return jsonResponse({ error: "Failed to look up entitlement" }, 500);
  if (!entitlement) return jsonResponse({ error: "Entitlement not found for this parent" }, 404);
  if (!["available", "reserved"].includes(entitlement.status)) {
    return jsonResponse({ error: `Entitlement is ${entitlement.status} and cannot be dispatched` }, 409);
  }

  const { data: subscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .select("started_at")
    .eq("id", entitlement.subscription_id)
    .maybeSingle();
  if (subscriptionError || !subscription) return jsonResponse({ error: "Failed to look up subscription" }, 500);

  const releaseAt = themeReleaseAt(subscription.started_at, entitlement.sequence_number);
  if (releaseAt.getTime() > Date.now()) {
    return jsonResponse({ error: "This theme has not been released yet", releaseAt: releaseAt.toISOString() }, 400);
  }

  if (entitlement.status === "available") {
    await admin
      .from("theme_entitlements")
      .update({ status: "reserved", reserved_at: new Date().toISOString() })
      .eq("id", entitlement.id);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const jobsResult: Record<string, { status: string; error?: string }> = {};

  for (const videoType of ["learning_video", "child_ai_video"] as const) {
    const provider = videoType === "learning_video" ? "heygen_hyperframes" : "higgsfield";

    const { data: existingJob } = await admin
      .from("ai_video_jobs")
      .select("id, status")
      .eq("entitlement_id", entitlement.id)
      .eq("video_type", videoType)
      .maybeSingle();

    if (existingJob && existingJob.status !== "failed") {
      jobsResult[videoType] = { status: existingJob.status };
      continue;
    }

    const jobId = existingJob?.id ?? crypto.randomUUID();
    if (!existingJob) {
      await admin.from("ai_video_jobs").insert({
        id: jobId,
        parent_id: user.id,
        child_id: entitlement.child_id,
        entitlement_id: entitlement.id,
        video_type: videoType,
        provider,
        status: "processing",
      });
    } else {
      await admin
        .from("ai_video_jobs")
        .update({ status: "processing", customer_message: null, error_detail: null })
        .eq("id", jobId);
    }

    const callbackUrl = `${supabaseUrl}/functions/v1/ai-video-webhook?job_id=${jobId}`;
    const dispatch = videoType === "learning_video"
      ? await dispatchHeyGenRender({ callbackUrl, jobId, variables: { entitlement_id: entitlement.id } })
      : await dispatchHiggsfieldJob({ callbackUrl, input: { entitlement_id: entitlement.id, child_id: entitlement.child_id } });

    if (dispatch.ok) {
      await admin.from("ai_video_jobs").update({ provider_job_id: dispatch.providerJobId }).eq("id", jobId);
      jobsResult[videoType] = { status: "processing" };
    } else {
      await admin
        .from("ai_video_jobs")
        .update({
          status: "failed",
          customer_message: FAILURE_MESSAGE,
          error_detail: { error: dispatch.error },
        })
        .eq("id", jobId);
      await admin.from("admin_alerts").insert({
        category: "ai_production",
        message: `${provider} dispatch failed`,
        context: { job_id: jobId, entitlement_id: entitlement.id, error: dispatch.error },
      });
      await admin.from("notifications").insert({
        parent_id: user.id,
        notification_type: "ai_job_failed",
        title: "AI 影片製作遇到問題",
        body: FAILURE_MESSAGE,
      });
      jobsResult[videoType] = { status: "failed", error: dispatch.error };
    }
  }

  return jsonResponse({ entitlementId: entitlement.id, jobs: jobsResult });
});
