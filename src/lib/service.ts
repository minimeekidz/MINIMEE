export type IntegrationStatus = "demo" | "ready-to-connect" | "blocked";

export const integrationStatus = {
  supabase: "ready-to-connect",
  stripe: "blocked",
  aiProvider: "blocked",
  email: "blocked"
} satisfies Record<string, IntegrationStatus>;

export async function demoRequest<T>(payload: T): Promise<{ ok: true; data: T }> {
  await new Promise((resolve) => window.setTimeout(resolve, 120));
  return { ok: true, data: payload };
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
