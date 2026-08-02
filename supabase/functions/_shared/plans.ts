// Mirrors MINIMEE_OPERATIONS.md section 3. plan_type values match the
// `billing_orders`/`subscriptions` check constraints already in the
// database; stripeLookupKey matches the Stripe Price.lookup_key created for
// each plan (test mode). Do not change amounts here without Em's approval
// per the ops doc.
export type PlanType = "one_time_theme" | "monthly_3m" | "yearly";

export interface PlanConfig {
  planType: PlanType;
  stripeLookupKey: string;
  mode: "payment" | "subscription";
  expectedAmountHkd: number;
}

export const PLAN_CONFIG: Record<PlanType, PlanConfig> = {
  one_time_theme: {
    planType: "one_time_theme",
    stripeLookupKey: "minimee_one_time",
    mode: "payment",
    expectedAmountHkd: 128,
  },
  monthly_3m: {
    planType: "monthly_3m",
    stripeLookupKey: "minimee_quarterly",
    mode: "subscription",
    expectedAmountHkd: 324,
  },
  yearly: {
    planType: "yearly",
    stripeLookupKey: "minimee_annual",
    mode: "subscription",
    expectedAmountHkd: 1188,
  },
};

export function isPlanType(value: unknown): value is PlanType {
  return typeof value === "string" && value in PLAN_CONFIG;
}
