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
  verifyPin: "POST /parent-pin/verify",
  createTopicRun: "POST /topic-runs",
  answerLearningNode: "POST /learning/answer",
  createCheckout: "POST /stripe/checkout",
  issueCard: "POST /cards/issue",
  createAiJob: "POST /ai/jobs",
  createExport: "POST /exports"
} as const;
