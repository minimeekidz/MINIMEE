import { Archive, Bell, BookOpen, CalendarClock, Download, Film, HeartHandshake, Image, Plus, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { DashboardHeader, DemoBadge, EmptyState, FeatureCard, IntegrationNotice, Progress, Shell, StatusPill } from "../components/UI";
import { demoChild, notifications, topics } from "../data/mock";

export function ParentDashboard() {
  return (
    <Shell surface="parent">
      <DashboardHeader title="早晨，Em" />
      <IntegrationNotice />
      <section className="dashboard-grid">
        <article className="child-overview">
          <div className="child-profile">
            <img src="/assets/hero-girl.webp" alt="合成示範英雄角色" />
            <div><DemoBadge label="CHILD 1 OF 2" /><h2>{demoChild.displayName}</h2><p>{demoChild.heroName} · {demoChild.ageBand}</p></div>
          </div>
          <Progress value={75} label="今期主題進度" />
          <div className="stats-row"><div><strong>3/4</strong><span>學習節點</span></div><div><strong>4</strong><span>MEE 卡</span></div><div><strong>6</strong><span>連續學習日</span></div></div>
          <Link className="button" to="/parent/children/demo-child-01">查看 Mimi</Link>
        </article>
        <article className="next-action">
          <StatusPill tone="gold">今期下一步</StatusPill><h2>完成「巴士」小任務</h2><p>最後一塊 Mystery Shard 完成後，會解鎖個人化影片準備。</p>
          <div className="shards">{["✓", "✓", "✓", "?"].map((x, i) => <span className={i < 3 ? "done" : ""} key={i}>{x}</span>)}</div>
          <Link className="button secondary" to="/child/hero-studio">進入 Hero Studio</Link>
        </article>
      </section>
      <section className="section-block"><div className="block-heading"><div><span className="eyebrow">通知中心</span><h2>需要你留意</h2></div><Link to="/parent/notifications">全部通知</Link></div>
        <div className="notification-list">{notifications.map(n => <div key={n.title}><span className={`notice-dot ${n.tone}`} /><div><strong>{n.title}</strong><small>{n.meta}</small></div></div>)}</div>
      </section>
    </Shell>
  );
}

export function ChildProfilePage() {
  return (
    <Shell surface="parent"><DashboardHeader title="Mimi 的成長檔案" /><div className="profile-hero">
      <img src="/assets/hero-girl.webp" alt="合成示範英雄角色" /><div><DemoBadge /><h2>Mimi · 星光探險家</h2><p>6–8 歲 · 粵語引領 · 寵物 Pip</p><div className="chip-row"><StatusPill tone="green">訂閱有效</StatusPill><StatusPill>家長控制</StatusPill></div></div>
    </div>
    <div className="feature-grid">
      <FeatureCard title="學習主題" detail="1 進行中 · 1 待選擇" to="/parent/children/demo-child-01/themes" icon={<BookOpen />} />
      <FeatureCard title="訂閱管理" detail="方案、付款及取消" to="/parent/children/demo-child-01/subscription" icon={<CalendarClock />} />
      <FeatureCard title="影片與相片" detail="私有素材與製作狀態" to="/parent/media" icon={<Film />} />
      <FeatureCard title="好友與分享" detail="逐段影片獨立批准" to="/parent/children/demo-child-01/sharing" icon={<HeartHandshake />} />
      <FeatureCard title="遺失物件" detail="匿名 QR 聯絡流程" to="/parent/children/demo-child-01/lost-items" icon={<Archive />} />
      <FeatureCard title="資料與私隱" detail="同意、匯出及刪除" to="/parent/privacy" icon={<ShieldCheck />} />
    </div></Shell>
  );
}

export function ThemesPage() {
  return <Shell surface="parent"><DashboardHeader title="Mimi 的學習主題" /><div className="topic-grid">{topics.map(t => <article key={t.title}><StatusPill tone={t.color}>{t.status}</StatusPill><h2>{t.title}</h2><Progress value={t.progress} label="完成進度" /><button className="button secondary" disabled={t.progress === 100}>{t.progress ? "查看進度" : "待後端啟用"}</button></article>)}</div><EmptyState title="主題選擇尚未接通" detail="接入 Supabase 後，未使用、已預留、已消耗及鎖定權益會在此顯示。" /></Shell>;
}

export function SubscriptionPage() {
  return <Shell surface="parent"><DashboardHeader title="Mimi 的訂閱" /><div className="split-cards">
    <article><DemoBadge /><StatusPill tone="green">ACTIVE</StatusPill><h2>3 個月收藏方案</h2><p>按月派發，每月 2 個小主題。MEE FLASH 機率 30%。</p><dl><div><dt>今期狀態</dt><dd>合成示範</dd></div><div><dt>下次結算</dt><dd>待 Stripe 連接</dd></div></dl><button className="button" disabled>管理付款方式</button></article>
    <article><CalendarClock /><h2>取消與保留規則</h2><p>取消不等於即時終止。180 日倒數由已付服務期的 <code>current_period_end</code> 開始。</p><ul className="plain-list"><li>唯讀期仍可查看及下載</li><li>第 0、90、150、173 日提醒</li><li>第 180 日撤銷分享並刪除兒童媒體</li></ul></article>
  </div></Shell>;
}

export function ParentAlbums() {
  return <Shell surface="parent"><DashboardHeader title="MEE 紀念冊" /><div className="album-teasers">
    {["01–06 城市出發", "07–12 海洋與夜行", "13–18 尚待正式底圖", "19–24 尚待正式底圖"].map((x, i) => <Link to="/child/albums" key={x} style={i < 2 ? { backgroundImage: `linear-gradient(0deg, rgba(25,18,58,.75), transparent), url(/assets/${i ? "album-ocean" : "album-night"}.webp)` } : undefined}><span>BOOK {i + 1}</span><h2>{x}</h2><small>{i < 2 ? "查看示範卡位" : "缺少正式資產"}</small></Link>)}
  </div></Shell>;
}

const parentRouteInfo: Record<string, [string, string, string]> = {
  media: ["影片與相片", "每項素材會使用私有儲存及短效查看連結。", "Supabase Storage"],
  sharing: ["好友與分享", "好友關係及每段 AI 影片分享是兩種獨立權限。", "Share API"],
  "lost-items": ["失物 QR", "公開失物頁不可顯示孩子資料或家長電話。", "Lost-item token"],
  privacy: ["私隱與完整下載", "查看同意紀錄、建立完整紀念包及提出刪除要求。", "Export / Retention"],
  notifications: ["通知中心", "權益、期限、影片、付款、朋友與客服通知。", "Notification service"]
};

export function ParentRoutePlaceholder({ kind }: { kind: string }) {
  const [title, detail, dependency] = parentRouteInfo[kind] ?? ["家長功能", "此路由已建立。", "Backend"];
  const params = useParams();
  return <Shell surface="parent"><DashboardHeader title={title} /><section className="placeholder-panel"><span className="placeholder-icon">{kind === "privacy" ? <Download /> : kind === "media" ? <Image /> : <Bell />}</span><DemoBadge label="ROUTE READY" /><h2>{detail}</h2><p>需要連接：{dependency}。現時不會把按鈕導向假成功狀態。</p>{params.caseId && <StatusPill>Case {params.caseId}</StatusPill>}<button className="button" disabled><Plus />尚未接通</button></section></Shell>;
}
