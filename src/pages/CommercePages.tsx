import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, CreditCard, Crown, LockKeyhole, ShieldCheck, Zap } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { DashboardHeader, DemoBadge, Shell, StatusPill } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import { useFamily } from "../contexts/FamilyContext";

type PlanType = "one_time_theme" | "monthly_3m" | "yearly";
type CheckoutState = "review" | "processing" | "ready" | "failed";

const checkoutPlans = [
  {
    type: "one_time_theme" as const,
    icon: <Zap />,
    title: "單次主題",
    price: "HK$128",
    note: "單次付款｜永久保留",
    detail: "1 個主題＋學習影片＋小朋友 AI 影片＋小遊戲",
  },
  {
    type: "monthly_3m" as const,
    icon: <CalendarDays />,
    title: "3 個月預繳",
    price: "HK$324",
    note: "約 HK$108／月",
    detail: "每兩星期 1 個主題，共 6 個主題",
  },
  {
    type: "yearly" as const,
    icon: <Crown />,
    title: "全年預繳",
    price: "HK$1,188",
    note: "約 HK$99／月",
    detail: "每兩星期 1 個主題，共 24 個主題",
  },
];

export function CheckoutPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { children } = useFamily();
  const child = useMemo(() => children.find(record => record.id === id), [children, id]);
  const [planType, setPlanType] = useState<PlanType>("monthly_3m");
  const [state, setState] = useState<CheckoutState>("review");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedPlan = checkoutPlans.find(plan => plan.type === planType) ?? checkoutPlans[1];
  const returned = searchParams.get("checkout");

  async function createCheckout() {
    if (!child || !session?.access_token) {
      setError("登入或孩子資料尚未準備，請重新整理後再試。");
      setState("failed");
      return;
    }
    setState("processing");
    setError(null);
    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ childId: child.id, planType }),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "未能建立付款頁");
      setCheckoutUrl(result.url);
      setState("ready");
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "未能建立付款頁");
      setState("failed");
    }
  }

  return <Shell surface="parent">
    <DashboardHeader title={`${child?.nickname ?? "孩子"}的獨立訂閱`} />
    <section className="checkout-layout">
      <article className="checkout-card">
        <DemoBadge label="STRIPE SECURE CHECKOUT" />
        <h2>選擇方案</h2>
        <p>只套用於{child?.nickname ?? "這名孩子"}；其他孩子需要分別選擇方案及付款。</p>
        <div className="checkout-plan-grid">
          {checkoutPlans.map(plan => <button
            type="button"
            className={`checkout-plan${planType === plan.type ? " selected" : ""}`}
            aria-pressed={planType === plan.type}
            onClick={() => { setPlanType(plan.type); setState("review"); setCheckoutUrl(null); }}
            key={plan.type}
          >
            {plan.icon}<strong>{plan.title}</strong><b>{plan.price}</b><small>{plan.note}</small>
          </button>)}
        </div>
        <dl>
          <div><dt>孩子</dt><dd>{child?.nickname ?? "載入中"}</dd></div>
          <div><dt>內容</dt><dd>{selectedPlan.detail}</dd></div>
          <div><dt>價格</dt><dd>{selectedPlan.price}</dd></div>
        </dl>
        <div className="secure-payment"><LockKeyhole /><span>付款資料只由Stripe處理，MINIMEE不儲存完整卡號。</span></div>
        {returned === "returned" && <div className="payment-result success" role="status"><ShieldCheck /><div><strong>Stripe 已返回網站</strong><p>伺服器正在核實付款；收到「付款已確認」站內訊息後，權益才正式啟用。</p></div></div>}
        {returned === "cancelled" && <div className="payment-result failed" role="alert"><AlertTriangle /><div><strong>付款已取消</strong><p>沒有派發任何訂閱或主題權益，你可重新選擇方案。</p></div></div>}
        {state === "review" && <button className="button" onClick={createCheckout}><CreditCard />建立 Stripe 安全付款頁</button>}
        {state === "processing" && <div className="checkout-state" role="status"><span className="spinner" /><div><strong>正在建立安全付款頁</strong><p>售價由伺服器鎖定，瀏覽器不能更改。</p></div></div>}
        {state === "ready" && checkoutUrl && <div className="checkout-state" role="status"><ShieldCheck /><div><strong>安全付款頁已準備</strong><p>下一頁由 Stripe 處理付款資料。</p><a className="button" href={checkoutUrl}>前往 Stripe 付款</a></div></div>}
        {state === "failed" && <div className="payment-result failed" role="alert"><AlertTriangle /><div><strong>未能建立付款頁</strong><p>{error}</p><button onClick={() => setState("review")}>重新嘗試</button></div></div>}
      </article>
      <aside className="checkout-safety"><ShieldCheck /><h2>付款保障</h2><ul><li>每名孩子獨立訂閱及權益</li><li>Stripe Webhook 簽署核實</li><li>伺服器再次核對港幣金額</li><li>重複通知不會重複派發</li><li>失敗及取消不建立假訂閱</li></ul></aside>
    </section>
  </Shell>;
}

export function SubscriptionStatesPage() {
  const [status, setStatus] = useState<"active" | "past_due" | "cancelled" | "read_only">("active");
  const [cancelStep, setCancelStep] = useState<0 | 1 | 2>(0);
  const details = {
    active: ["訂閱有效", "可以使用已派發的主題權益。", "green"],
    past_due: ["付款待處理", "暫停派發新權益，保留已付款成果。", "gold"],
    cancelled: ["已取消續訂", "服務維持至已付期間完結。", "violet"],
    read_only: ["180日唯讀期", "只可查看及下載，不可建立新內容。", "gold"]
  } as const;
  const [title, detail, tone] = details[status];
  return <Shell surface="parent">
    <DashboardHeader title="Mimi的訂閱狀態" />
    <section className="subscription-state-card">
      <StatusPill tone={tone}>{title}</StatusPill><h2>3個月收藏方案</h2><p>{detail}</p>
      <div className="state-switcher">{(["active","past_due","cancelled","read_only"] as const).map(value => <button className={status === value ? "active" : ""} onClick={() => setStatus(value)} key={value}>{details[value][0]}</button>)}</div>
      <div className="subscription-actions"><Link className="button secondary" to="/parent/children/demo-child-01/checkout"><CreditCard />付款狀態預覽</Link><button className="danger-link" onClick={() => setCancelStep(1)}>取消續訂</button></div>
    </section>
    {cancelStep > 0 && <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="cancel-title"><section className="confirm-card"><AlertTriangle /><DemoBadge label={`STEP ${cancelStep} OF 2`} /><h2 id="cancel-title">{cancelStep === 1 ? "取消不等於立即刪除" : "確認停止續訂？"}</h2><p>{cancelStep === 1 ? "Mimi會使用至已付服務期完結，之後才進入180日唯讀期。" : "示範版只顯示狀態，不會向Stripe提交取消。"}</p><div className="confirm-actions"><button className="button secondary" onClick={() => setCancelStep(0)}>返回</button>{cancelStep === 1 ? <button className="button" onClick={() => setCancelStep(2)}>繼續</button> : <button className="button danger-button" onClick={() => { setStatus("cancelled"); setCancelStep(0); }}>確認停止續訂</button>}</div></section></div>}
  </Shell>;
}
