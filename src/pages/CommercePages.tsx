import { useEffect, useState } from "react";
import { AlertTriangle, Check, Clapperboard, CreditCard, LockKeyhole, RefreshCw, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { DashboardHeader, EmptyState, Shell, StatusPill } from "../components/UI";
import { useFamily } from "../contexts/FamilyContext";
import { useChildBilling, type ThemeSlot } from "../lib/billing";
import { PLANS, findPlan, type PlanType } from "../lib/plans";
import { cancelSubscription, createAiVideoJobs, createBillingOrder } from "../lib/service";

const dateFormat = new Intl.DateTimeFormat("zh-HK", { year: "numeric", month: "long", day: "numeric" });

function formatDate(value: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}

export function CheckoutPage() {
  const { id: childId } = useParams();
  const [searchParams] = useSearchParams();
  const { children, loading: familyLoading } = useFamily();
  const { loading, error, subscription, refresh } = useChildBilling(childId);
  const [planType, setPlanType] = useState<PlanType>("monthly_3m");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const child = children.find(candidate => candidate.id === childId);
  const redirectStatus = searchParams.get("status");

  // Stripe sends the parent back here after Checkout, but the redirect only
  // says the browser came back — it is never proof of payment. The
  // subscription row is created by stripe-webhook after signature
  // verification, so poll for it rather than trusting `?status=success`.
  useEffect(() => {
    if (redirectStatus !== "success" || subscription) return;
    const timer = window.setTimeout(() => { void refresh(); }, 2500);
    return () => window.clearTimeout(timer);
  }, [redirectStatus, subscription, refresh]);

  async function startCheckout() {
    if (!childId) return;
    setSubmitting(true);
    setSubmitError(null);
    const result = await createBillingOrder({ childId, planType });
    if (!result.ok || !result.data?.url) {
      setSubmitError(result.ok ? "未能開啟付款頁面，請稍後再試。" : friendlyCheckoutError(result.error));
      setSubmitting(false);
      return;
    }
    window.location.href = result.data.url;
  }

  if (familyLoading || loading) {
    return <Shell surface="parent"><DashboardHeader title="訂閱付款" /><EmptyState title="載入中" detail="正在讀取這位小朋友的訂閱狀態。" /></Shell>;
  }

  if (!child) {
    return <Shell surface="parent"><DashboardHeader title="訂閱付款" />
      <EmptyState title="找不到這位小朋友" detail="這個帳戶沒有管理這位小朋友，或者連結已失效。" />
    </Shell>;
  }

  const selected = findPlan(planType);

  return <Shell surface="parent">
    <DashboardHeader title={`${child.nickname}的獨立訂閱`} />

    {error && <div className="payment-result failed" role="alert"><XCircle /><div><strong>未能載入訂閱資料</strong><p>{error}</p></div></div>}

    {redirectStatus === "cancelled" && !subscription &&
      <div className="payment-result failed" role="alert"><XCircle /><div>
        <strong>付款未完成</strong>
        <p>你在Stripe取消了付款，所以沒有建立訂閱，亦沒有扣減任何權益。可以再選方案重新開始。</p>
      </div></div>}

    {redirectStatus === "success" && !subscription &&
      <div className="checkout-state" role="status">
        <span className="spinner" />
        <div>
          <strong>正在等待Stripe確認</strong>
          <p>付款成功與否只由已驗證的Webhook決定，不以瀏覽器返回頁判定。確認後這頁會自動更新。</p>
        </div>
      </div>}

    {subscription
      ? <section className="subscription-state-card">
          <StatusPill tone="green">訂閱已啟用</StatusPill>
          <h2>{findPlan(subscription.plan_type).title}</h2>
          <p>{child.nickname}的訂閱已由已驗證的Stripe Webhook確認，主題權益已派發。</p>
          <div className="subscription-actions">
            <Link className="button" to={`/parent/children/${child.id}/subscription`}><Sparkles />查看主題與影片</Link>
          </div>
        </section>
      : <section className="checkout-layout">
          <article className="checkout-card">
            <h2>為{child.nickname}選擇方案</h2>
            <p>每名小朋友需要獨立訂閱；這裡選的方案只套用於{child.nickname}。</p>

            <div className="plan-choice" role="radiogroup" aria-label="訂閱方案">
              {PLANS.map(plan => (
                <label key={plan.planType} className={planType === plan.planType ? "plan-option selected" : "plan-option"}>
                  <input
                    type="radio"
                    name="planType"
                    value={plan.planType}
                    checked={planType === plan.planType}
                    onChange={() => setPlanType(plan.planType)}
                  />
                  <span className="plan-option-body">
                    <strong>{plan.emoji} {plan.title}</strong>
                    <span className="plan-option-price">{plan.price}</span>
                    <small>{plan.priceNote}</small>
                  </span>
                </label>
              ))}
            </div>

            <dl>
              <div><dt>孩子</dt><dd>{child.nickname}</dd></div>
              <div><dt>內容</dt><dd>{selected.subtitle}</dd></div>
              <div><dt>價格</dt><dd>{selected.price}</dd></div>
            </dl>

            <div className="secure-payment"><LockKeyhole /><span>付款資料只由Stripe處理，MINIMEE不儲存完整卡號。</span></div>

            {submitError && <div className="payment-result failed" role="alert"><XCircle /><div><strong>未能開始付款</strong><p>{submitError}</p></div></div>}

            <button className="button" onClick={() => void startCheckout()} disabled={submitting}>
              <CreditCard />{submitting ? "正在開啟Stripe付款頁…" : `以${selected.price}付款`}
            </button>
          </article>

          <aside className="checkout-safety">
            <ShieldCheck /><h2>付款驗收規則</h2>
            <ul>
              <li>每名孩子獨立Subscription ID</li>
              <li>Webhook event ID去重</li>
              <li>付款成功才派發權益</li>
              <li>失敗及取消不建立假訂閱</li>
            </ul>
          </aside>
        </section>}
  </Shell>;
}

function friendlyCheckoutError(message: string) {
  if (message.includes("already has an active subscription")) return "這位小朋友已經有生效中的訂閱。";
  if (message.includes("not configured in Stripe")) return "這個方案尚未在Stripe設定好，請聯絡MINIMEE客服。";
  if (message.includes("Not authenticated")) return "登入狀態已過期，請重新登入後再試。";
  return "未能開始付款，請稍後再試或聯絡客服。";
}

const STATUS_LABELS: Record<string, [string, string, string]> = {
  active: ["訂閱有效", "可以使用已派發的主題權益。", "green"],
  past_due: ["付款待處理", "暫停派發新權益，保留已付款成果。", "gold"],
  cancelled: ["已取消續訂", "服務維持至已付期間完結。", "violet"],
  expired: ["訂閱已完結", "已付服務期已結束。", "violet"],
  read_only: ["180日唯讀期", "只可查看及下載，不可建立新內容。", "gold"],
};

export function SubscriptionStatesPage() {
  const { id: childId } = useParams();
  const { children, loading: familyLoading } = useFamily();
  const { loading, error, subscription, themes, refresh } = useChildBilling(childId);
  const [cancelStep, setCancelStep] = useState<0 | 1 | 2>(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyEntitlement, setBusyEntitlement] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const child = children.find(candidate => candidate.id === childId);

  async function confirmCancel() {
    if (!childId) return;
    setCancelling(true);
    setActionError(null);
    const result = await cancelSubscription({ childId });
    setCancelling(false);
    setCancelStep(0);
    if (!result.ok) {
      setActionError("未能提交取消續訂，請稍後再試或聯絡客服。");
      return;
    }
    await refresh();
  }

  async function startVideos(entitlementId: string) {
    setBusyEntitlement(entitlementId);
    setActionError(null);
    const result = await createAiVideoJobs({ entitlementId });
    setBusyEntitlement(null);
    if (!result.ok) {
      setActionError("未能開始製作影片，我們已記錄低今次嘗試，不會扣減主題權益。");
      return;
    }
    await refresh();
  }

  if (familyLoading || loading) {
    return <Shell surface="parent"><DashboardHeader title="訂閱狀態" /><EmptyState title="載入中" detail="正在讀取訂閱及主題資料。" /></Shell>;
  }

  if (!child) {
    return <Shell surface="parent"><DashboardHeader title="訂閱狀態" />
      <EmptyState title="找不到這位小朋友" detail="這個帳戶沒有管理這位小朋友，或者連結已失效。" />
    </Shell>;
  }

  if (!subscription) {
    return <Shell surface="parent">
      <DashboardHeader title={`${child.nickname}的訂閱狀態`} />
      <EmptyState title="尚未有訂閱" detail={`${child.nickname}還未有生效中的訂閱，選擇方案後主題就會開始派發。`} />
      <div className="subscription-actions">
        <Link className="button" to={`/parent/children/${child.id}/checkout`}><CreditCard />選擇方案</Link>
      </div>
    </Shell>;
  }

  const [title, detail, tone] = STATUS_LABELS[subscription.status] ?? STATUS_LABELS.active;
  const plan = findPlan(subscription.plan_type);
  const canCancel = subscription.status === "active" && !subscription.cancel_at_period_end && plan.planType !== "one_time_theme";

  return <Shell surface="parent">
    <DashboardHeader title={`${child.nickname}的訂閱狀態`} />

    {error && <div className="payment-result failed" role="alert"><XCircle /><div><strong>未能載入訂閱資料</strong><p>{error}</p></div></div>}
    {actionError && <div className="payment-result failed" role="alert"><XCircle /><div><strong>操作未完成</strong><p>{actionError}</p></div></div>}

    <section className="subscription-state-card">
      <StatusPill tone={tone}>{title}</StatusPill>
      <h2>{plan.title}</h2>
      <p>{detail}</p>
      <dl className="subscription-facts">
        <div><dt>開始日期</dt><dd>{formatDate(subscription.started_at)}</dd></div>
        {subscription.current_period_end && <div><dt>本期完結</dt><dd>{formatDate(subscription.current_period_end)}</dd></div>}
        {subscription.read_only_until && <div><dt>唯讀期至</dt><dd>{formatDate(subscription.read_only_until)}</dd></div>}
        <div><dt>主題配額</dt><dd>{subscription.theme_allowance}個</dd></div>
      </dl>

      {subscription.cancel_at_period_end && subscription.status === "active" &&
        <p className="subscription-note">已排定於本期完結後停止續訂，{child.nickname}可以繼續使用至{formatDate(subscription.current_period_end)}。</p>}

      <div className="subscription-actions">
        {canCancel && <button className="danger-link" onClick={() => setCancelStep(1)}>取消續訂</button>}
      </div>
    </section>

    <section className="theme-release-list">
      <h2>主題與影片</h2>
      {themes.length === 0
        ? <EmptyState title="仲未派發主題" detail="訂閱確認後，第一個主題會即時解鎖，之後每兩星期解鎖一個。" />
        : <ol className="theme-slots">{themes.map(slot => <ThemeSlotRow
            key={slot.entitlement.id}
            slot={slot}
            busy={busyEntitlement === slot.entitlement.id}
            onStart={() => void startVideos(slot.entitlement.id)}
          />)}</ol>}
    </section>

    {cancelStep > 0 && <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
      <section className="confirm-card">
        <AlertTriangle />
        <h2 id="cancel-title">{cancelStep === 1 ? "取消不等於立即刪除" : "確認停止續訂？"}</h2>
        <p>{cancelStep === 1
          ? `${child.nickname}會使用至已付服務期完結，之後才進入180日唯讀期。`
          : "我們會通知Stripe不再收取下一期費用，已付的服務期不受影響。"}</p>
        <div className="confirm-actions">
          <button className="button secondary" onClick={() => setCancelStep(0)} disabled={cancelling}>返回</button>
          {cancelStep === 1
            ? <button className="button" onClick={() => setCancelStep(2)}>繼續</button>
            : <button className="button danger-button" onClick={() => void confirmCancel()} disabled={cancelling}>
                {cancelling ? "提交中…" : "確認停止續訂"}
              </button>}
        </div>
      </section>
    </div>}
  </Shell>;
}

function ThemeSlotRow({ slot, busy, onStart }: { slot: ThemeSlot; busy: boolean; onStart: () => void }) {
  const { entitlement, released, releaseAt, jobs, ready, failed } = slot;
  const started = jobs.length > 0;

  return <li className="theme-slot">
    <div className="theme-slot-heading">
      <strong>主題 {entitlement.sequence_number}</strong>
      {!released && <StatusPill tone="violet">{formatDate(releaseAt)}解鎖</StatusPill>}
      {released && ready && <StatusPill tone="green">影片已完成</StatusPill>}
      {released && !ready && failed && <StatusPill tone="gold">製作中斷</StatusPill>}
      {released && !ready && !failed && started && <StatusPill tone="gold">製作中</StatusPill>}
      {released && !started && <StatusPill tone="green">可以開始</StatusPill>}
    </div>

    {failed && <p className="theme-slot-note">
      {jobs.find(job => job.customer_message)?.customer_message
        ?? "AI 影片製作遇到問題，我們已經記錄低呢次嘗試，會盡快人手處理，唔會扣減你嘅主題權益。"}
    </p>}

    {jobs.length > 0 && <ul className="theme-slot-jobs">{jobs.map(job => <li key={job.id}>
      <Clapperboard size={15} />
      <span>{job.video_type === "learning_video" ? "學習影片" : "小朋友AI影片"}</span>
      {job.status === "completed" && job.asset_url
        ? <a href={job.asset_url} target="_blank" rel="noreferrer">觀看</a>
        : <small>{job.status === "failed" ? "待人手處理" : "製作中"}</small>}
    </li>)}</ul>}

    {released && (!started || failed) &&
      <button className="button small" onClick={onStart} disabled={busy}>
        {failed ? <RefreshCw size={15} /> : <Sparkles size={15} />}
        {busy ? "提交中…" : failed ? "重新製作" : "開始製作影片"}
      </button>}

    {!released && <p className="theme-slot-note">每兩星期解鎖一個主題，到期後就可以開始製作。</p>}

    {ready && <p className="theme-slot-note"><Check size={15} />兩段影片都已完成，可以喺影片區重溫。</p>}
  </li>;
}
