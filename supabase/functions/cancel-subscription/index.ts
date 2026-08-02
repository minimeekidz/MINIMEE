import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin, getSupabaseForRequest, getStripe } from "../_shared/clients.ts";

// Stops the next renewal for one child's subscription. Deliberately does
// NOT end the period the parent already paid for: Stripe keeps the
// subscription active until `current_period_end`, and stripe-webhook is
// what eventually flips the local row to `cancelled` and starts the
// 180-day read-only tail. Cancelling never touches already-minted theme
// entitlements.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const userClient = getSupabaseForRequest(req);
  const { data: userData, error: authError } = await userClient.auth.getUser();
  if (authError || !userData?.user) return jsonResponse({ error: "Not authenticated" }, 401);
  const user = userData.user;

  let body: { childId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  if (!body.childId) return jsonResponse({ error: "childId is required" }, 400);

  const admin = getSupabaseAdmin();

  // Scope by parent_id as well as child_id so a guessed child id from
  // another family cannot be cancelled.
  const { data: subscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .select("id, plan_type, status, stripe_subscription_id, current_period_end, cancel_at_period_end")
    .eq("child_id", body.childId)
    .eq("parent_id", user.id)
    .in("status", ["active", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (subscriptionError) return jsonResponse({ error: "Failed to look up subscription" }, 500);
  if (!subscription) return jsonResponse({ error: "No active subscription for this child" }, 404);

  if (subscription.plan_type === "one_time_theme" || !subscription.stripe_subscription_id) {
    return jsonResponse({ error: "This plan does not renew, so there is nothing to cancel" }, 409);
  }

  if (subscription.cancel_at_period_end) {
    return jsonResponse({ alreadyCancelled: true, currentPeriodEnd: subscription.current_period_end });
  }

  const stripe = getStripe();
  let updated;
  try {
    updated = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  } catch (error) {
    await admin.from("admin_alerts").insert({
      category: "billing",
      message: "Stripe cancel_at_period_end failed",
      context: {
        subscription_id: subscription.id,
        stripe_subscription_id: subscription.stripe_subscription_id,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return jsonResponse({ error: "Failed to stop the renewal with Stripe" }, 502);
  }

  const currentPeriodEnd = new Date(updated.current_period_end * 1000).toISOString();
  const { error: updateError } = await admin
    .from("subscriptions")
    .update({ cancel_at_period_end: true, current_period_end: currentPeriodEnd })
    .eq("id", subscription.id);
  if (updateError) {
    // Stripe is already the source of truth and has accepted the change, so
    // report success to the parent and let the operator reconcile the local
    // row; customer.subscription.updated will also re-sync it.
    await admin.from("admin_alerts").insert({
      category: "billing",
      message: "Subscription cancelled at Stripe but local row not updated",
      context: { subscription_id: subscription.id, error: updateError.message },
    });
  }

  return jsonResponse({ cancelled: true, currentPeriodEnd });
});
