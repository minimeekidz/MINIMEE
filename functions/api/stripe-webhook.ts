import { json, messageFrom } from "../_shared/http";
import { isPlanType, PLAN_CATALOG } from "../_shared/payment-config";
import {
  retrieveCheckoutSession,
  stripeWebhookSecret,
  verifyStripeSignature,
} from "../_shared/stripe";
import {
  finalizeCheckout,
  SupabaseEnvironment,
  updateNotificationEmailStatus,
} from "../_shared/supabase-admin";

interface Env extends SupabaseEnvironment {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  MAKE_WEBHOOK_URL?: string;
  MAKE_SHARED_SECRET?: string;
}

type StripeEvent = {
  id: string;
  type: string;
  data?: { object?: { id?: string } };
};

async function notifyMake(env: Env, notification: {
  notification_id: string;
  recipient_email: string;
  title: string;
  body: string;
}) {
  const url = env.MAKE_WEBHOOK_URL?.trim();
  const secret = env.MAKE_SHARED_SECRET?.trim();
  if (!url || !secret) throw new Error("Make notification integration is not configured");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      "X-MINIMEE-Notification-Id": notification.notification_id,
    },
    body: JSON.stringify({
      notification_id: notification.notification_id,
      event_type: "payment_verified",
      recipient_email: notification.recipient_email,
      title: notification.title,
      body: notification.body,
      channels: ["in_app", "anonymous_email"],
    }),
  });
  if (!response.ok) throw new Error(`Make returned ${response.status}`);
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const rawBody = await request.text();
  try {
    const verified = await verifyStripeSignature(
      rawBody,
      request.headers.get("Stripe-Signature"),
      stripeWebhookSecret(env),
    );
    if (!verified) return json({ error: "Invalid Stripe signature" }, 400);

    const event = JSON.parse(rawBody) as StripeEvent;
    const supported = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);
    if (!supported.has(event.type)) return json({ received: true, ignored: true });
    const sessionId = event.data?.object?.id;
    if (!event.id || !sessionId) return json({ error: "Invalid Stripe event" }, 400);

    const session = await retrieveCheckoutSession(env, sessionId);
    const { order_id, parent_id, child_id, plan_type } = session.metadata || {};
    if (!order_id || !parent_id || !child_id || !isPlanType(plan_type)) {
      return json({ error: "Missing verified Checkout metadata" }, 400);
    }
    const plan = PLAN_CATALOG[plan_type];
    if (session.payment_status !== "paid" || session.currency !== "hkd" || session.amount_total !== plan.amount) {
      return json({ error: "Verified payment does not match the MINIMEE order" }, 400);
    }

    const notification = await finalizeCheckout(env, {
      p_event_id: event.id,
      p_event_type: event.type,
      p_stripe_session_id: session.id,
      p_payment_intent_id: session.payment_intent || "",
      p_order_id: order_id,
      p_parent_id: parent_id,
      p_child_id: child_id,
      p_plan_type: plan_type,
      p_amount_total: session.amount_total,
      p_currency: session.currency,
      p_payment_status: session.payment_status,
    });

    try {
      await notifyMake(env, notification);
      await updateNotificationEmailStatus(env, notification.notification_id, "sent");
    } catch (error) {
      await updateNotificationEmailStatus(env, notification.notification_id, "failed");
      throw error;
    }
    return json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", messageFrom(error));
    return json({ error: "Webhook processing failed" }, 500);
  }
};
