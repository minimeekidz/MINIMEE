import { getSupabaseAdmin } from "../_shared/clients.ts";

// Called by the Make scenario right after it generates the multi-angle
// character + scene storyboard images (from the child's photo, the theme's
// VO template, and the parent's answers) and before it dispatches the
// Higgsfield child_ai_video render. Decoupled from ai-video-webhook because
// a storyboard belongs to the entitlement (shared prep for the video render),
// not to an individual provider job.
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const entitlementId = new URL(req.url).searchParams.get("entitlement_id");
  if (!entitlementId) return new Response("Missing entitlement_id", { status: 400 });

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const failed = payload.status === "failed";

  if (failed) {
    await admin
      .from("video_storyboards")
      .update({ status: "failed", error_detail: payload })
      .eq("entitlement_id", entitlementId);

    await admin.from("admin_alerts").insert({
      category: "ai_production",
      message: "Storyboard generation failed",
      context: { entitlement_id: entitlementId, provider_payload: payload },
    });
  } else {
    const characterImages = Array.isArray(payload.character_images) ? payload.character_images : [];
    const sceneImages = Array.isArray(payload.scene_images) ? payload.scene_images : [];
    await admin
      .from("video_storyboards")
      .update({ status: "completed", character_images: characterImages, scene_images: sceneImages })
      .eq("entitlement_id", entitlementId);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
