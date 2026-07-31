import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getSupabaseAdmin, getSupabaseForRequest, getStripe } from "../_shared/clients.ts";
import { isPlanType, PLAN_CONFIG } from "../_shared/plans.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const userClient = getSupabaseForRequest(req);
  const { data: userData, error: authError } = await userClient.auth.getUser();
  if (authError || !userData?.user) return jsonResponse({ error: "Not authenticated" }, 401);
  const user = userData.user;

  let body: { childId?: string; planType?: string; origin?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { childId, planType } = body;
  if (!childId || !isPlanType(planType)) {
    return jsonResponse({ error: "childId and a valid planType are required" }, 400);
  }
  const plan = PLAN_CONFIG[planType];

  if (!user.email) return jsonResponse({ error: "Account has no email for order notifications" }, 400);

  const admin = getSupabaseAdmin();

  const { data: child, error: childError } = await admin
    .from("children")
    .select("id, parent_id")
    .eq("id", childId)
    .eq("parent_id", user.id)
    .maybeSingle();
  if (childError) return jsonResponse({ error: "Failed to look up child" }, 500);
  if (!child) return jsonResponse({ error: "Child not found for this parent" }, 404);

  const { data: existingSubscription, error: existingError } = await admin
    .from("subscriptions")
    .select("id")
    .eq("child_id", childId)
    .in("status", ["active", "past_due"])
    .maybeSingle();
  if (existingError) return jsonResponse({ error: "Failed to check existing subscription" }, 500);
  if (existingSubscription) return jsonResponse({ error: "This child already has an active subscription" }, 409);

  const { data: order, error: orderError } = await admin
    .from("billing_orders")
    .insert({
      parent_id: user.id,
      child_id: childId,
      plan_type: planType,
      expected_amount_hkd: plan.expectedAmountHkd,
      notification_email: user.email,
    })
    .select("id")
    .single();
  if (orderError || !order) return jsonResponse({ error: "Failed to create billing order" }, 500);

  const stripe = getStripe();
  const prices = await stripe.prices.list({ lookup_keys: [plan.stripeLookupKey], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) return jsonResponse({ error: "Plan price is not configured in Stripe" }, 500);

  const origin = body.origin?.startsWith("https://") ? body.origin : "https://minimee.me";

  const session = await stripe.checkout.sessions.create({
    mode: plan.mode,
    customer_email: user.email,
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `${origin}/parent/children/${childId}/checkout?status=success`,
    cancel_url: `${origin}/parent/children/${childId}/checkout?status=cancelled`,
    client_reference_id: order.id,
    metadata: { order_id: order.id, parent_id: user.id, child_id: childId, plan_type: planType },
    subscription_data: plan.mode === "subscription"
      ? { metadata: { order_id: order.id, parent_id: user.id, child_id: childId, plan_type: planType } }
      : undefined,
  });

  const { error: updateError } = await admin
    .from("billing_orders")
    .update({ stripe_session_id: session.id })
    .eq("id", order.id);
  if (updateError) return jsonResponse({ error: "Failed to attach Stripe session to order" }, 500);

  return jsonResponse({ url: session.url, orderId: order.id });
});
