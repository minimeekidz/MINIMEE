import { getSupabaseAdmin, getStripe } from "../_shared/clients.ts";
import { sendServiceEmail } from "../_shared/email.ts";
import type Stripe from "npm:stripe@17";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

const READ_ONLY_WINDOW_DAYS = 180;

function readOnlyDeadline(): string {
  const deadline = new Date();
  deadline.setUTCDate(deadline.getUTCDate() + READ_ONLY_WINDOW_DAYS);
  return deadline.toISOString();
}

async function raiseAdminAlert(admin: AdminClient, message: string, context: Record<string, unknown>) {
  await admin.from("admin_alerts").insert({ category: "billing", message, context });
}

// Delivers the parent-facing notification produced by the finalize_* RPCs
// through the in-site + anonymous-email channels (ops doc section 6), and
// keeps notifications.email_status honest about whether delivery actually
// succeeded rather than assuming it did.
async function deliverNotification(admin: AdminClient, rpcResult: {
  notification_id?: string;
  recipient_email?: string;
  title?: string;
  body?: string;
}) {
  if (!rpcResult.notification_id || !rpcResult.recipient_email) return;
  const emailResult = await sendServiceEmail({
    to: rpcResult.recipient_email,
    subject: rpcResult.title ?? "MINIMEE 通知",
    body: rpcResult.body ?? "",
  });
  await admin
    .from("notifications")
    .update({ email_status: emailResult.ok ? "sent" : "failed" })
    .eq("id", rpcResult.notification_id);
  if (!emailResult.ok) {
    await raiseAdminAlert(admin, "Service email delivery failed", {
      notification_id: rpcResult.notification_id,
      reason: emailResult.error,
    });
  }
}

async function handleCheckoutCompleted(admin: AdminClient, event: Stripe.Event, session: Stripe.Checkout.Session) {
  const { order_id, parent_id, child_id, plan_type } = session.metadata ?? {};
  if (!order_id || !parent_id || !child_id || !plan_type) {
    await raiseAdminAlert(admin, "checkout.session.completed missing required metadata", { session_id: session.id });
    return;
  }

  const { data, error } = await admin.rpc("finalize_verified_checkout", {
    p_event_id: event.id,
    p_event_type: event.type,
    p_stripe_session_id: session.id,
    p_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : "",
    p_order_id: order_id,
    p_parent_id: parent_id,
    p_child_id: child_id,
    p_plan_type: plan_type,
    p_amount_total: Math.round((session.amount_total ?? 0) / 100),
    p_currency: session.currency ?? "hkd",
    p_payment_status: session.payment_status,
  });

  if (error) {
    await raiseAdminAlert(admin, "finalize_verified_checkout failed", { session_id: session.id, error: error.message });
    throw error;
  }
  if (!data?.already_processed) {
    await deliverNotification(admin, data);
  }
}

async function handleInvoicePaid(admin: AdminClient, event: Stripe.Event, invoice: Stripe.Invoice) {
  if (invoice.billing_reason !== "subscription_cycle") return; // first period is handled by checkout.session.completed
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
  if (!subscriptionId) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const { data, error } = await admin.rpc("finalize_subscription_renewal", {
    p_event_id: event.id,
    p_event_type: event.type,
    p_stripe_subscription_id: subscriptionId,
    p_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  });

  if (error) {
    await raiseAdminAlert(admin, "finalize_subscription_renewal failed", { subscription_id: subscriptionId, error: error.message });
    throw error;
  }
  if (!data?.already_processed) {
    await deliverNotification(admin, data);
  }
}

async function handleSubscriptionUpdated(admin: AdminClient, subscription: Stripe.Subscription) {
  const statusMap: Record<string, string> = {
    active: "active",
    trialing: "active",
    past_due: "past_due",
    unpaid: "past_due",
    canceled: "cancelled",
    incomplete_expired: "cancelled",
  };
  const mappedStatus = statusMap[subscription.status];
  if (!mappedStatus) return;

  const update: Record<string, unknown> = {
    status: mappedStatus,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    // Mirrors a renewal stopped either from the parent-facing
    // cancel-subscription function or directly in the Stripe dashboard, and
    // re-syncs if the parent resumes the subscription there.
    cancel_at_period_end: subscription.cancel_at_period_end,
  };
  if (mappedStatus === "cancelled") update.read_only_until = readOnlyDeadline();

  await admin.from("subscriptions").update(update).eq("stripe_subscription_id", subscription.id);
}

async function handleSubscriptionDeleted(admin: AdminClient, subscription: Stripe.Subscription) {
  await admin
    .from("subscriptions")
    .update({ status: "cancelled", read_only_until: readOnlyDeadline() })
    .eq("stripe_subscription_id", subscription.id);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !webhookSecret) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = getSupabaseAdmin();

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(admin, event, event.data.object as Stripe.Checkout.Session);
        break;
      case "invoice.paid":
        await handleInvoicePaid(admin, event, event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(admin, event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(admin, event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (error) {
    // Non-2xx lets Stripe retry; every handler above is idempotent (the
    // finalize_* RPCs dedupe on event id, and the subscription syncs are
    // plain upserts-by-field), so a retry after a transient failure is safe.
    console.error("stripe-webhook handler failed", event.type, error);
    return new Response("Internal error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
