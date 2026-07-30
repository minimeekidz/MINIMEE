import { isPlanType, PLAN_CATALOG } from "../_shared/payment-config";
import { json, messageFrom } from "../_shared/http";
import { createCheckoutSession } from "../_shared/stripe";
import {
  authenticatedUser,
  insertOrder,
  ownedChild,
  SupabaseEnvironment,
  updateOrderSession,
} from "../_shared/supabase-admin";

interface Env extends SupabaseEnvironment {
  STRIPE_SECRET_KEY?: string;
  SITE_URL?: string;
}

function bearerToken(request: Request) {
  const value = request.headers.get("Authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function siteUrl(env: Env, request: Request) {
  const configured = env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    const token = bearerToken(request);
    if (!token) return json({ error: "請重新登入後再付款。" }, 401);
    const body = await request.json() as { childId?: unknown; planType?: unknown };
    if (typeof body.childId !== "string" || !isPlanType(body.planType)) {
      return json({ error: "付款方案或孩子資料無效。" }, 400);
    }

    const user = await authenticatedUser(env, token);
    if (!user.email) return json({ error: "家長帳戶必須有已驗證電郵。" }, 400);
    const child = await ownedChild(env, token, body.childId, user.id);
    if (!child) return json({ error: "找不到這名孩子或你沒有存取權。" }, 403);

    const plan = PLAN_CATALOG[body.planType];
    const order = await insertOrder(env, {
      parent_id: user.id,
      child_id: child.id,
      plan_type: body.planType,
      expected_amount_hkd: plan.amount,
      currency: "hkd",
      notification_email: user.email,
    });
    const origin = siteUrl(env, request);
    const metadata = {
      order_id: order.id,
      parent_id: user.id,
      child_id: child.id,
      plan_type: body.planType,
    };
    const session = await createCheckoutSession(env, {
      mode: "payment",
      client_reference_id: order.id,
      customer_email: user.email,
      success_url: `${origin}/parent/children/${child.id}/checkout?checkout=returned`,
      cancel_url: `${origin}/parent/children/${child.id}/checkout?checkout=cancelled`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "hkd",
      "line_items[0][price_data][unit_amount]": String(plan.amount),
      "line_items[0][price_data][product_data][name]": `MINIMEE｜${plan.label}`,
      "line_items[0][price_data][product_data][description]": plan.description,
      ...Object.fromEntries(Object.entries(metadata).map(([key, value]) => [`metadata[${key}]`, value])),
    }, order.id);
    if (!session.url) throw new Error("Stripe did not return a Checkout URL");
    await updateOrderSession(env, order.id, session.id);
    return json({ url: session.url });
  } catch (error) {
    console.error("Unable to create Stripe Checkout", messageFrom(error));
    return json({ error: "暫時未能建立安全付款頁，請稍後再試。" }, 500);
  }
};
