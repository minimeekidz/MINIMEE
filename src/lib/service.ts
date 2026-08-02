import { supabase } from "./supabase";

export type IntegrationStatus = "demo" | "ready-to-connect" | "connected" | "blocked";

export const integrationStatus = {
  supabase: "connected",
  // The parent commerce pages call create-billing-order / cancel-subscription
  // for real and read subscriptions, theme_entitlements and ai_video_jobs
  // through RLS. Stripe itself is still in test mode: live Products/Prices
  // and a live webhook endpoint have to be recreated before real families
  // are charged (MINIMEE_OPERATIONS.md section 7a).
  stripe: "connected",
  // create-ai-video-jobs is wired to the theme list, but dispatch fails
  // closed until MAKE_AI_VIDEO_WEBHOOK_URL is set and the Make scenario has
  // real provider credentials in place of its REPLACE_WITH_YOUR_*
  // placeholders (MINIMEE_OPERATIONS.md section 7b).
  aiProvider: "ready-to-connect",
  email: "ready-to-connect"
} satisfies Record<string, IntegrationStatus>;

export async function demoRequest<T>(payload: T): Promise<{ ok: true; data: T }> {
  await new Promise((resolve) => window.setTimeout(resolve, 120));
  return { ok: true, data: payload };
}

export type PlanType = "one_time_theme" | "monthly_3m" | "yearly";

// POST /stripe/checkout — creates a billing_orders row and a Stripe
// Checkout Session, returning the URL to redirect the parent to. The
// subscription/entitlements are only granted once stripe-webhook verifies
// payment; this call never grants anything by itself.
export async function createBillingOrder(params: { childId: string; planType: PlanType }) {
  if (!supabase) return { ok: false as const, error: "Supabase is not configured" };
  const { data, error } = await supabase.functions.invoke<{ url: string; orderId: string }>(
    "create-billing-order",
    { body: { ...params, origin: window.location.origin } },
  );
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

// POST /ai/jobs — dispatches the learning_video + child_ai_video jobs for a
// released theme entitlement.
export async function createAiVideoJobs(params: { entitlementId: string }) {
  if (!supabase) return { ok: false as const, error: "Supabase is not configured" };
  const { data, error } = await supabase.functions.invoke("create-ai-video-jobs", { body: params });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

// POST /children/:id/subscription/cancel — stops the next renewal without
// touching the period the parent has already paid for. The subscription
// only becomes `cancelled` (and starts its 180-day read-only tail) when
// Stripe reports the period actually ended, via stripe-webhook.
export async function cancelSubscription(params: { childId: string }) {
  if (!supabase) return { ok: false as const, error: "Supabase is not configured" };
  const { data, error } = await supabase.functions.invoke<{ currentPeriodEnd: string | null }>(
    "cancel-subscription",
    { body: params },
  );
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export const apiContracts = {
  createChild: "POST /children",
  listChildren: "GET /children",
  createChildSubscription: "POST /children/:id/subscriptions",
  verifyPin: "POST /parent-pin/verify",
  recordConsent: "POST /children/:id/consents",
  createPrivateUpload: "POST /children/:id/uploads",
  createTopicRun: "POST /topic-runs",
  answerLearningNode: "POST /learning/answer",
  createCheckout: "POST /stripe/checkout",
  createBillingPortal: "POST /stripe/billing-portal",
  cancelChildSubscription: "POST /children/:id/subscription/cancel",
  getAdminQueue: "GET /admin/:module",
  issueCard: "POST /cards/issue",
  createAiJob: "POST /ai/jobs",
  escalateAiJob: "POST /ai/jobs/:id/escalate",
  notifyParent: "POST /notifications/parent",
  createLostItemMessage: "POST /lost-items/:token/messages",
  relayLostItemEmail: "POST /lost-items/:token/email-relay",
  updateNotificationPreferences: "PATCH /notification-preferences",
  createSupportCase: "POST /support/cases",
  createDeletionRequest: "POST /privacy/deletion-requests",
  createExport: "POST /exports"
} as const;
