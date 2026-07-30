export type PlanType = "one_time_theme" | "monthly_3m" | "yearly";

export const PLAN_CATALOG = {
  one_time_theme: {
    amount: 12_800,
    label: "單次主題",
    description: "1 個主題及永久保留成果",
  },
  monthly_3m: {
    amount: 32_400,
    label: "3 個月預繳方案",
    description: "每兩星期 1 個主題，共 6 個主題",
  },
  yearly: {
    amount: 118_800,
    label: "全年預繳方案",
    description: "每兩星期 1 個主題，共 24 個主題",
  },
} as const;

export function isPlanType(value: unknown): value is PlanType {
  return typeof value === "string" && value in PLAN_CATALOG;
}

