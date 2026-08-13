import { useState } from "react";
import { AlertTriangle, Archive, BookOpen, CalendarClock, Film, Gamepad2, HeartHandshake, IdCard, Plus, QrCode, ShieldCheck, Trash2, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { DashboardHeader, DemoBadge, EmptyState, FeatureCard, IntegrationNotice, Progress, Shell, StatusPill } from "../components/UI";
import { activeFriends, friendHistory, notifications, topics } from "../data/mock";
import { MAX_CHILDREN_PER_PARENT } from "../domain/rules";
import { useAuth } from "../contexts/AuthContext";
import { useFamily } from "../contexts/FamilyContext";

const languageLabels = { "zh-HK": "粵語", "zh-CN": "普通話", en: "English" };

export function ParentDashboard() {
  const { user } = useAuth();
  const { children, loading, error, canAddChild } = useFamily();
  const parentName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "家長";
  const firstChild = children[0];

  return (
    <Shell surface="parent">
      <DashboardHeader title={`你好，${parentName}`} />
      <IntegrationNotice />
      <Link className="parent-world-banner" to={firstChild ? `/parent/children/${firstChild.id}` : "/parent/setup"}>
        <div><DemoBadge label="親子天地" /><h2>孩子的學習與童年回憶，都在同一個地方。</h2><span>{firstChild ? `打開 ${firstChild.nickname} 的成長檔案` : "建立第一名孩子"} →</span></div>
      </Link>
      {loading && <EmptyState title="正在載入家庭資料" detail="我們正在安全地讀取你的孩子檔案。" />}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !children.length && <EmptyState title="尚未建立孩子檔案" detail="建立第一名孩子後，家庭總覽會顯示在這裡。孩子不會有獨立登入。" />}
      {!!children.length && <section className="family-child-grid">
        {children.map((child, index) => <article className="child-overview" key={child.id}>
          <div className="child-profile">
            <img src="/assets/hero-girl.webp" alt="MINIMEE 合成角色示意" />
            <div><DemoBadge label={`CHILD ${index + 1} OF ${MAX_CHILDREN_PER_PARENT}`} /><h2>{child.nickname}</h2><p>{child.age_group ? `${child.age_group} 歲組` : "年齡組未設定"} · {languageLabels[child.preferred_language]}</p></div>
          </div>
          <Progress value={0} label="學習主題尚未啟用" />
          <div className="stats-row"><div><strong>0</strong><span>學習節點</span></div><div><strong>0</strong><span>MEE 卡</span></div><div><strong>0</strong><span>連續學習日</span></div></div>
          <Link className="button" to={`/parent/children/${child.id}`}>查看 {child.nickname}</Link>
        </article>)}
      </section>}
      <section className="child-account-summary">
        <div><Users /><span><strong>{children.length}／{MAX_CHILDREN_PER_PARENT} 名孩子</strong><small>同一家長管理；每名孩子需要獨立訂閱</small></span></div>
        {canAddChild ? <Link className="button secondary" to="/parent/setup"><Plus />新增孩子</Link> : <StatusPill tone="gold">已達上限</StatusPill>}
      </section>
      <section className="section-block"><div className="block-heading"><div><span className="eyebrow">通知中心</span><h2>需要你留意</h2></div><Link to="/parent/notifications">全部通知</Link></div>
        <div className="notification-list">{notifications.map(n => <div key={n.title}><span className={`notice-dot ${n.tone}`} /><div><strong>{n.title}</strong><small>{n.meta}</small></div></div>)}</div>
      </section>
    </Shell>
  );
}

export function ChildProfilePage() {
  const { id } = useParams();
  const { children, loading } = useFamily();
  const child = children.find(item => item.id === id);
  if (loading) return <Shell surface="parent"><EmptyState title="正在載入孩子檔案" detail="請稍候。" /></Shell>;
  if (!child) return <Shell surface="parent"><EmptyState title="找不到這名孩子" detail="這個檔案不存在，或不屬於目前登入的家長帳戶。" /></Shell>;
  const base = `/parent/children/${child.id}`;
  return (
    <Shell surface="parent"><DashboardHeader title={`${child.nickname} 的成長檔案`} /><div className="profile-hero">
      <img src="/assets/hero-girl.webp" alt="MINIMEE 合成角色示意" /><div><DemoBadge label="真實孩子檔案" /><h2>{child.nickname}</h2><p>{child.age_group ? `${child.age_group} 歲組` : "年齡組未設定"} · {languageLabels[child.preferred_language]}{child.interests.length ? ` · ${child.interests.join("、")}` : ""}</p><div className="chip-row"><StatusPill tone="gold">尚未訂閱</StatusPill><StatusPill>家長控制</StatusPill></div></div>
    </div>
    <div className="feature-grid">
      <FeatureCard title="自我介紹卡" detail="小朋友嘅電子名片，家長批核後先公開" to={`${base}/card`} icon={<IdCard />} />
      <FeatureCard title="MEE 小鎮" detail="小朋友行遊戲執 MEE 卡" to={`${base}/play`} icon={<Gamepad2 />} />
      <FeatureCard title="學習主題" detail="產品資料尚未接駁" to={`${base}/themes`} icon={<BookOpen />} />
      <FeatureCard title="訂閱管理" detail="付款服務尚未接駁" to={`${base}/subscription`} icon={<CalendarClock />} />
      <FeatureCard title="影片與相片" detail="私人儲存尚未啟用" to="/parent/media" icon={<Film />} />
      <FeatureCard title="好友與分享" detail="分享資料庫尚未接駁" to={`${base}/sharing`} icon={<HeartHandshake />} />
      <FeatureCard title="遺失物件" detail="匿名通知服務尚未接駁" to={`${base}/lost-items`} icon={<Archive />} />
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
