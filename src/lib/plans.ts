// Single source of truth for the plans in MINIMEE_OPERATIONS.md section 3.
// The ops doc's section 12 asks for pricing to stay centralized rather than
// duplicated across pages, so both the public PricingPage and the parent
// CheckoutPage read from here. `planType` matches the check constraints on
// billing_orders/subscriptions and the PLAN_CONFIG in
// supabase/functions/_shared/plans.ts — the Edge Function re-derives the
// price from Stripe, so these amounts are for display only and are never
// what the parent is actually charged.

export type PlanType = "one_time_theme" | "monthly_3m" | "yearly";

export interface Plan {
  planType: PlanType;
  title: string;
  subtitle: string;
  price: string;
  priceNote: string;
  amountHkd: number;
  /** Themes minted for the first paid period. */
  themeAllowance: number;
  cardArt: string;
  emoji: string;
  perks: string[];
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    planType: "one_time_theme",
    title: "單次主題",
    subtitle: "One-time · 單次試試的MiniMEE~",
    price: "HK$128",
    priceNote: "單次付款｜帳戶存在期間可保留",
    amountHkd: 128,
    themeAllowance: 1,
    cardArt: "/assets/card-01.webp",
    emoji: "🎯",
    perks: [
      "揀1個主題",
      "1×學習影片＋1×小朋友AI影片＋學習小遊戲",
      "普通版MEE收藏卡PDF下載",
    ],
  },
  {
    planType: "monthly_3m",
    title: "3個月MiniMEE訂閱",
    subtitle: "一次訂閱3個月・每月派發2個主題（每2星期1個）",
    price: "HK$324",
    priceNote: "約HK$108／月 · 可隨時停止續訂",
    amountHkd: 324,
    themeAllowance: 6,
    cardArt: "/assets/card-05.webp",
    emoji: "📅",
    perks: [
      "每月2個主題",
      "每月2×學習影片＋2×小朋友AI影片＋學習小遊戲＋小寵物養成計劃",
      "朋友紀念冊【10位名額】｜帳戶存在期間可保留",
      "普通版MEE收藏卡PDF下載",
      "可加購章節HK$46／1章",
      "可開啟遺失模式",
    ],
    highlight: true,
  },
  {
    planType: "yearly",
    title: "1年精明MiniMEE訂閱",
    subtitle: "一次訂閱全年・每月派發2個主題（每2星期1個）",
    price: "HK$1,188",
    priceNote: "約HK$99／月 · 可隨時停止續訂",
    amountHkd: 1188,
    themeAllowance: 24,
    cardArt: "/assets/card-11.webp",
    emoji: "👑",
    perks: [
      "每月2個主題",
      "每月2×學習影片＋2×小朋友AI影片＋學習小遊戲＋小寵物養成計劃",
      "朋友紀念冊【不設名額上限】｜帳戶存在期間可保留",
      "炫彩版MEE收藏卡PDF下載",
      "可開啟遺失模式",
      "多語言配音（普通話＋粵語＋英語）",
      "可加購章節HK$46／1章",
    ],
  },
];

export function findPlan(planType: PlanType): Plan {
  const plan = PLANS.find(candidate => candidate.planType === planType);
  if (!plan) throw new Error(`Unknown plan type: ${planType}`);
  return plan;
}
