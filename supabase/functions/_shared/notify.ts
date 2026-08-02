import { getSupabaseAdmin } from "./clients.ts";
import { sendServiceEmail } from "./email.ts";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

// Inserts the in-app notification row, then delivers the same content by
// email (ops doc section 6's anonymous-email channel) using the
// notification_email snapshotted on the subscription's originating
// billing_order — matching the pattern already used for billing
// notifications in stripe-webhook. Never throws: an email delivery failure
// is recorded (notifications.email_status + admin_alerts), not surfaced to
// the caller.
export async function notifyParent(admin: AdminClient, params: {
  parentId: string;
  subscriptionId: string;
  notificationType: string;
  title: string;
  body: string;
}): Promise<void> {
  const { data: notification } = await admin
    .from("notifications")
    .insert({
      parent_id: params.parentId,
      notification_type: params.notificationType,
      title: params.title,
      body: params.body,
    })
    .select("id")
    .maybeSingle();
  if (!notification) return;

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("source_order_id")
    .eq("id", params.subscriptionId)
    .maybeSingle();
  if (!subscription?.source_order_id) return;

  const { data: order } = await admin
    .from("billing_orders")
    .select("notification_email")
    .eq("id", subscription.source_order_id)
    .maybeSingle();
  if (!order?.notification_email) return;

  const emailResult = await sendServiceEmail({
    to: order.notification_email,
    subject: params.title,
    body: params.body,
  });

  await admin
    .from("notifications")
    .update({ email_status: emailResult.ok ? "sent" : "failed" })
    .eq("id", notification.id);

  if (!emailResult.ok) {
    await admin.from("admin_alerts").insert({
      category: "ai_production",
      message: "Service email delivery failed",
      context: { notification_id: notification.id, reason: emailResult.error },
    });
  }
}
