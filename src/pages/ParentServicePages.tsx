import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, Bell, Check, Download, LockKeyhole, Mail, MessageCircle, PackageSearch, QrCode, ShieldCheck, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { DashboardHeader, DemoBadge, Shell, StatusPill } from "../components/UI";
import { supabase } from "../lib/supabase";

type NotificationRecord = {
  id: string;
  title: string;
  body: string;
  email_status: "pending" | "sent" | "failed";
  read_at: string | null;
  created_at: string;
};

export function PublicLostItemPage() {
  const { token } = useParams();
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    setSent(true);
  }

  return <main className="lost-public-page">
    <section className="lost-public-card">
      <div className="lost-safe-icon"><PackageSearch /></div>
      <DemoBadge label="MINIMEE LOST ITEM" />
      <h1>你找到一件MINIMEE物品</h1>
      <p>你可以匿名通知物主家長。這個頁面不會顯示孩子姓名、家長電話、地址或電郵。</p>
      {!sent ? <form onSubmit={submit}>
        <label>在哪裏找到？<input aria-label="找到物品的位置" required placeholder="例如：九龍公園入口" /></label>
        <label>匿名訊息<textarea aria-label="匿名訊息" required maxLength={300} placeholder="請簡單說明物品現時放在哪裏" /></label>
        <button className="button" type="submit"><MessageCircle />通知物主家長</button>
      </form> : <div className="lost-sent" role="status"><Check /><div><strong>示範通知已建立</strong><p>正式連接後，系統會同時發出站內訊息及匿名電郵轉寄。</p></div></div>}
      <div className="privacy-footnote"><ShieldCheck /><span>匿名Token：{token?.slice(0, 6) || "DEMO"}…　不會公開任何兒童資料</span></div>
    </section>
  </main>;
}

export function LostItemsPage() {
  return <Shell surface="parent">
    <DashboardHeader title="失物QR管理" />
    <section className="service-policy"><ShieldCheck /><div><strong>雙重匿名通知</strong><p>拾獲者提交後，同時建立站內訊息及匿名電郵；雙方都看不到對方的私人聯絡資料。</p></div></section>
    <div className="service-grid">
      <section className="service-card">
        <div className="block-heading"><div><span className="eyebrow">已啟用物品</span><h2>Mimi的背包掛牌</h2></div><StatusPill tone="green">有效</StatusPill></div>
        <div className="qr-demo"><QrCode /><div><strong>匿名QR Token</strong><small>只解析物品記錄，不包含孩子或家長資料</small></div></div>
        <Link className="button secondary" to="/lost/demo-safe-token">預覽公開失物頁</Link>
      </section>
      <section className="service-card">
        <span className="eyebrow">最近訊息</span><h2>尚未收到失物通知</h2>
        <p>正式訊息只顯示拾獲地點、匿名內容及提交時間。</p>
        <div className="channel-row"><Bell />站內通知<span>已啟用</span></div>
        <div className="channel-row"><Mail />匿名電郵<span>已啟用</span></div>
      </section>
    </div>
  </Shell>;
}

export function NotificationsPage() {
  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(true);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadNotifications() {
      if (!supabase?.from) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("notifications")
        .select("id,title,body,email_status,read_at,created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (!active) return;
      if (error) console.error("Unable to load MINIMEE notifications", error.message);
      else setNotifications((data ?? []) as NotificationRecord[]);
      setLoading(false);
    }
    void loadNotifications();
    return () => { active = false; };
  }, []);

  return <Shell surface="parent">
    <DashboardHeader title="通知中心" />
    <section className="notification-preferences">
      <div><Bell /><span><strong>站內通知</strong><small>付款、影片、權益、好友、失物及私隱要求</small></span><input aria-label="站內通知" type="checkbox" checked={inApp} onChange={event => setInApp(event.target.checked)} /></div>
      <div><Mail /><span><strong>電郵通知</strong><small>重要事件及匿名失物轉寄</small></span><input aria-label="電郵通知" type="checkbox" checked={email} onChange={event => setEmail(event.target.checked)} /></div>
    </section>
    <section className="service-card notification-centre">
      <span className="eyebrow">最近通知</span>
      {loading && <p>正在載入通知…</p>}
      {!loading && notifications.length === 0 && <p>目前沒有新通知。付款經 Stripe 核實後會在此顯示。</p>}
      {notifications.map(notification => <article key={notification.id}>
        <span className="notice-dot" />
        <div><strong>{notification.title}</strong><p>{notification.body}</p></div>
        <small>{new Date(notification.created_at).toLocaleDateString("zh-HK")}</small>
      </article>)}
    </section>
  </Shell>;
}

export function PrivacyCenterPage() {
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  return <Shell surface="parent">
    <DashboardHeader title="私隱與完整下載" />
    <section className="service-policy"><LockKeyhole /><div><strong>家長控制兒童資料</strong><p>所有同意、下載、撤回、分享及刪除要求都必須重新驗證並寫入審計紀錄。</p></div></section>
    <div className="privacy-action-grid">
      <section><ShieldCheck /><h2>同意紀錄</h2><p>AI製作及私有媒體用途 · 示範版本1.0</p><StatusPill tone="green">有效</StatusPill></section>
      <section><Download /><h2>完整紀念包</h2><p>建立短效下載連結；連結不可永久公開。</p><button className="button secondary" disabled>待Export服務連接</button></section>
      <section className="danger-zone"><Trash2 /><h2>提出刪除要求</h2><p>不會即時刪除；先重新驗證、顯示影響範圍及建立可審計要求。</p><button className="danger-link" onClick={() => setDeleteStep(1)}>開始刪除流程</button></section>
    </div>
    <section className="retention-timeline"><span className="eyebrow">訂閱取消後</span><h2>180日唯讀與提醒</h2><div>{[["Day 0","進入唯讀期"],["Day 90","第一次提醒"],["Day 150","下載提醒"],["Day 173","最後提醒"],["Day 180","撤銷分享並執行已批准刪除"]].map(([day,detail]) => <article key={day}><strong>{day}</strong><small>{detail}</small></article>)}</div></section>
    {deleteStep > 0 && <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="privacy-delete-title"><section className="confirm-card"><AlertTriangle /><DemoBadge label={`STEP ${deleteStep} OF 2`} /><h2 id="privacy-delete-title">{deleteStep === 1 ? "這不是即時刪除按鈕" : "建立刪除要求？"}</h2><p>{deleteStep === 1 ? "你將先看到受影響的影片、卡牌、好友分享及保留期，再決定是否繼續。" : "示範版只建立前台要求，不會永久刪除任何資料。"}</p><div className="confirm-actions"><button className="button secondary" onClick={() => setDeleteStep(0)}>取消</button>{deleteStep === 1 ? <button className="button" onClick={() => setDeleteStep(2)}>查看影響並繼續</button> : <button className="button danger-button" onClick={() => setDeleteStep(0)}>建立示範要求</button>}</div></section></div>}
  </Shell>;
}

export function SupportCasePage() {
  const { caseId } = useParams();
  return <Shell surface="parent">
    <DashboardHeader title="客服個案" />
    <section className="support-case">
      <div className="block-heading"><div><DemoBadge label={`CASE ${caseId || "DEMO-001"}`} /><h2>影片需要人工處理</h2></div><StatusPill tone="gold">處理中</StatusPill></div>
      <p>家長毋須重新提交素材。主題權益保持已預留，完成後會同時收到站內及電郵通知。</p>
      <div className="case-timeline">{[["已建立個案","系統偵測製作失敗並通知Em"],["人工檢查中","檢查供應商回應、素材及QC結果"],["完成後通知","通過QC才會派發影片及MEE Card"]].map(([title,detail],index) => <article key={title}><span>{index + 1}</span><div><strong>{title}</strong><small>{detail}</small></div></article>)}</div>
      <button className="button secondary" disabled><MessageCircle />待客服訊息服務連接</button>
    </section>
  </Shell>;
}
