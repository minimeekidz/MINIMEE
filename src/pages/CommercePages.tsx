import { useState } from "react";
import { AlertTriangle, Check, CreditCard, LockKeyhole, ShieldCheck, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardHeader, DemoBadge, Shell, StatusPill } from "../components/UI";

type CheckoutState = "review" | "processing" | "success" | "failed";

export function CheckoutPage() {
  const [state, setState] = useState<CheckoutState>("review");
  return <Shell surface="parent">
    <DashboardHeader title="Mimi的獨立訂閱" />
    <section className="checkout-layout">
      <article className="checkout-card">
        <DemoBadge label="STRIPE DEMO STATE" />
        <h2>3個月收藏方案</h2>
        <p>只套用於Mimi；其他孩子需要分別選擇方案及付款。</p>
        <dl><div><dt>孩子</dt><dd>Mimi</dd></div><div><dt>內容</dt><dd>每月2個小主題</dd></div><div><dt>價格</dt><dd>HK$ —　待確認</dd></div></dl>
        <div className="secure-payment"><LockKeyhole /><span>付款資料只由Stripe處理，MINIMEE不儲存完整卡號。</span></div>
        {state === "review" && <button className="button" onClick={() => setState("processing")}><CreditCard />進入示範付款</button>}
        {state === "processing" && <div className="checkout-state"><span className="spinner" /><div><strong>正在等待Stripe確認</strong><p>正式版本只信已驗證Webhook，不以瀏覽器返回頁判定付款成功。</p></div><div className="demo-state-actions"><button onClick={() => setState("success")}>模擬成功</button><button onClick={() => setState("failed")}>模擬失敗</button></div></div>}
        {state === "success" && <div className="payment-result success" role="status"><Check /><div><strong>付款確認</strong><p>Webhook確認後才會啟用Mimi的訂閱及主題權益。</p></div></div>}
        {state === "failed" && <div className="payment-result failed" role="alert"><XCircle /><div><strong>付款未完成</strong><p>不會建立訂閱或扣減權益。家長可重新嘗試或更換付款方式。</p><button onClick={() => setState("review")}>重新嘗試</button></div></div>}
      </article>
      <aside className="checkout-safety"><ShieldCheck /><h2>付款驗收規則</h2><ul><li>每名孩子獨立Subscription ID</li><li>Webhook event ID去重</li><li>付款成功才派發權益</li><li>失敗及取消不建立假訂閱</li></ul></aside>
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
