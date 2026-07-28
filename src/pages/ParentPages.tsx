import { useState } from "react";
import { AlertTriangle, Archive, Bell, BookOpen, CalendarClock, Download, Film, HeartHandshake, Image, Plus, QrCode, ShieldCheck, Trash2, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { DashboardHeader, DemoBadge, EmptyState, FeatureCard, IntegrationNotice, Progress, Shell, StatusPill } from "../components/UI";
import { activeFriends, demoChild, friendHistory, notifications, topics } from "../data/mock";
import { MAX_CHILDREN_PER_PARENT } from "../domain/rules";

export function ParentDashboard() {
  return (
    <Shell surface="parent">
      <DashboardHeader title="早晨，Em" />
      <IntegrationNotice />
      <Link className="parent-world-banner" to="/parent/children/demo-child-01">
        <div><DemoBadge label="親子天地" /><h2>孩子的學習與童年回憶，都在同一個地方。</h2><span>打開 Mimi 的成長檔案 →</span></div>
      </Link>
      <section className="dashboard-grid">
        <article className="child-overview">
          <div className="child-profile">
            <img src="/assets/hero-girl.webp" alt="合成示範英雄角色" />
            <div><DemoBadge label={`CHILD 1 OF ${MAX_CHILDREN_PER_PARENT}`} /><h2>{demoChild.displayName}</h2><p>{demoChild.heroName} · {demoChild.ageBand}</p></div>
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
      <section className="child-account-summary">
        <div><Users /><span><strong>1／{MAX_CHILDREN_PER_PARENT} 名孩子</strong><small>同一家長管理；每名孩子獨立訂閱</small></span></div>
        <Link className="button secondary" to="/parent/setup"><Plus />新增孩子</Link>
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
  const [oceanState, setOceanState] = useState<"未使用" | "已預留">("未使用");
  const entitlementLegend = [
    ["未使用", "可由家長選擇"],
    ["已預留", "已選主題，完成或人工處理前不可重複使用"],
    ["已消耗", "影片完成並通過QC"],
    ["已鎖定", "付款或服務期狀態不允許使用"]
  ];
  return <Shell surface="parent">
    <DashboardHeader title="Mimi 的學習主題" />
    <section className="entitlement-legend">{entitlementLegend.map(([state, detail]) => <div key={state}><StatusPill tone={state === "已預留" ? "gold" : state === "已消耗" ? "green" : "violet"}>{state}</StatusPill><small>{detail}</small></div>)}</section>
    <div className="topic-grid">{topics.map(t => {
      const isOcean = t.title === "海洋研究所";
      const status = isOcean ? oceanState : t.progress === 100 ? "已消耗" : "已預留";
      return <article key={t.title}><StatusPill tone={status === "已消耗" ? "green" : status === "已預留" ? "gold" : t.color}>{status}</StatusPill><h2>{t.title}</h2><Progress value={t.progress} label="完成進度" />
        {isOcean
          ? <button className="button secondary" onClick={() => setOceanState("已預留")} disabled={oceanState === "已預留"}>{oceanState === "未使用" ? "選擇這個主題" : "權益已預留"}</button>
          : <button className="button secondary" disabled>{t.progress === 100 ? "已完成" : "進行中"}</button>}
      </article>;
    })}</div>
    <EmptyState title="尚未連接權益交易記錄" detail="正式接入後，所有預留、消耗、退回及人工處理都會寫入不可重複的權益交易。" />
  </Shell>;
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

export function FriendsSharingPage() {
  const [friends, setFriends] = useState(activeFriends);
  const [history, setHistory] = useState(friendHistory);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [scanState, setScanState] = useState<"idle" | "pending">("idle");
  const selected = friends[0];

  function confirmDelete() {
    if (!selected) return;
    setFriends([]);
    setHistory(current => [
      ...current,
      { id: selected.id, displayName: selected.displayName, icon: selected.icon, disconnectedAt: "剛剛" }
    ]);
    setDeleteStep(0);
  }

  return <Shell surface="parent">
    <DashboardHeader title="好友與分享" />
    <section className="friend-policy-strip"><ShieldCheck /><div><strong>孩子不會獨立登入或自行授權</strong><p>掃描QR只會建立請求；對方家長批准後才會連接，影片仍需逐段授權。</p></div></section>
    <div className="friend-manager-grid">
      <section className="friend-panel">
        <div className="block-heading"><div><span className="eyebrow">目前好友</span><h2>{friends.length} 位已連接</h2></div><button className="button secondary" onClick={() => setScanState("pending")}><QrCode />掃描QR</button></div>
        {friends.map(friend => <article className="friend-row" key={friend.id}>
          <span className="friend-avatar">{friend.icon}</span>
          <div><strong>{friend.displayName}</strong><small>已連接 · 影片逐段批准</small></div>
          <button className="danger-link" onClick={() => setDeleteStep(1)}><Trash2 />刪除</button>
        </article>)}
        {!friends.length && <EmptyState title="目前沒有已連接好友" detail="已刪除的好友只會留在歷史紀錄，不佔相簿Quota。" />}
        {scanState === "pending" && <div className="pending-consent"><QrCode /><div><strong>等待對方家長重新授權</strong><p>重新掃描不會恢復舊影片權限；每段影片仍需重新批准。</p></div><button onClick={() => setScanState("idle")}>關閉</button></div>}
      </section>
      <section className="friend-panel">
        <span className="eyebrow">歷史紀錄</span><h2>已中斷連接</h2>
        <p className="panel-intro">孩子可以看到朋友名字，但紀錄不會出現在好友相簿，也不佔任何Quota。</p>
        {history.map(friend => <article className="history-row" key={`${friend.id}-${friend.disconnectedAt}`}>
          <span>{friend.icon}</span><div><strong>{friend.displayName}</strong><small>已中斷 · {friend.disconnectedAt}</small></div><StatusPill>無存取權</StatusPill>
        </article>)}
      </section>
    </div>
    {deleteStep > 0 && <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-friend-title">
      <section className="confirm-card">
        <AlertTriangle />
        <DemoBadge label={`STEP ${deleteStep} OF 2`} />
        <h2 id="delete-friend-title">{deleteStep === 1 ? "你是否不小心按到刪除？" : `確定刪除 ${selected?.displayName}？`}</h2>
        <p>{deleteStep === 1 ? "返回不會更改任何資料。" : "刪除後會立即中斷連接、撤銷所有影片權限，並移到歷史紀錄。"}</p>
        <div className="confirm-actions">
          <button className="button secondary" onClick={() => setDeleteStep(0)}>返回，不刪除</button>
          {deleteStep === 1
            ? <button className="button" onClick={() => setDeleteStep(2)}>我想繼續</button>
            : <button className="button danger-button" onClick={confirmDelete}>確認刪除好友</button>}
        </div>
      </section>
    </div>}
  </Shell>;
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
  return <Shell surface="parent"><DashboardHeader title={title} />
    {kind === "media" && <section className="ai-failure-card">
      <AlertTriangle /><div><StatusPill tone="gold">需要人工處理</StatusPill><h2>我們正在為你仔細處理影片</h2><p>製作時遇到了一點情況，團隊已收到通知。暫時毋須重新提交資料，主題權益會保持預留。</p><small>示範狀態：系統會建立人工個案並通知Em，不向家長顯示技術錯誤。</small></div>
    </section>}
    <section className="placeholder-panel"><span className="placeholder-icon">{kind === "privacy" ? <Download /> : kind === "media" ? <Image /> : <Bell />}</span><DemoBadge label="ROUTE READY" /><h2>{detail}</h2><p>需要連接：{dependency}。現時不會把按鈕導向假成功狀態。</p>{params.caseId && <StatusPill>Case {params.caseId}</StatusPill>}<button className="button" disabled><Plus />尚未接通</button></section>
  </Shell>;
}
