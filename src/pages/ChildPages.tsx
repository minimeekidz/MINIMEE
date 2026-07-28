import { ChevronLeft, Heart, LockKeyhole, Mic, Play, ShieldCheck, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { DemoBadge, Progress, StatusPill } from "../components/UI";
import { cards, demoChild, locations, topics } from "../data/mock";

function ChildFrame({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="child-page">
      <div className="child-topbar">
        <Link to="/child" aria-label="返回 Pixel World"><ChevronLeft /></Link>
        <div><small>MINIMEE PIXEL WORLD</small><strong>{title}</strong></div>
        <Link to="/parent/dashboard" className="parent-gate"><ShieldCheck /><span>家長</span></Link>
      </div>
      <main className="child-frame">{children}</main>
      <div className="child-dock">
        <Link to="/child"><span>🗺️</span>小鎮</Link><Link to="/child/hero-studio"><span>⚡</span>任務</Link>
        <Link to="/child/albums"><span>🃏</span>卡冊</Link><Link to="/child/buddy"><span>☕</span>朋友</Link>
      </div>
    </div>
  );
}

export function PixelWorld() {
  return <ChildFrame title={`你好，${demoChild.displayName}！`}><section className="pixel-world-hero">
    <img className="world-bg" src="/assets/pet-heroes.webp" alt="MINIMEE 像素寵物世界角色參考" />
    <div className="world-overlay"><DemoBadge label="SYNTHETIC PREVIEW" /><h1>今天想去哪裏？</h1><p>完成最後一個任務，就可以砌好今期 Mystery Shards。</p><Progress value={75} label="城市小冒險" /></div>
  </section><section className="location-grid">{locations.map(l => <Link to={l.path} key={l.name}><span>{l.emoji}</span><div><strong>{l.name}</strong><small>{l.detail}</small></div></Link>)}</section>
  <div className="coming-soon"><span>⚓</span><div><strong>碼頭市集</strong><small>前往親子天地的入口 · 功能未開放</small></div><LockKeyhole /></div></ChildFrame>;
}

export function HeroStudio() {
  const nodes = ["港鐵", "紅綠燈", "巴士", "天星小輪"];
  return <ChildFrame title="Hero Studio"><div className="studio-head"><StatusPill tone="gold">城市小冒險</StatusPill><h1>差一塊就完成！</h1><p>每個詞語都有一條三選一問題，再由家長 PIN 確認。</p></div>
  <div className="node-path">{nodes.map((n, i) => <article className={i < 3 ? "complete" : "current"} key={n}><span>{i < 3 ? "✓" : i + 1}</span><div><small>NODE 0{i + 1}</small><strong>{n}</strong></div><button disabled={i !== 3}>{i < 3 ? "完成" : "開始"}</button></article>)}</div>
  <div className="shard-panel"><Sparkles /><div><strong>Mystery Shards</strong><p>四塊集齊後只會解鎖影片任務，不會立即派發 MEE Card。</p></div><div className="mini-shards"><i /><i /><i /><i className="missing" /></div></div></ChildFrame>;
}

export function AlbumsPage() {
  return <ChildFrame title="MEE Album House"><div className="studio-head"><StatusPill>MEE BOOK 1–4</StatusPill><h1>我的童年收藏</h1><p>每張卡有固定位置。未有正式圖檔的卡位會清楚標示缺少素材。</p></div>
  <div className="album-grid">{Array.from({ length: 24 }, (_, i) => i + 1).map(n => <article className={cards[n] ? "unlocked" : "locked"} key={n}>
    {cards[n] ? <img src={cards[n]} alt={`MEE Card ${String(n).padStart(2, "0")} 示範`} /> : <><LockKeyhole /><small>缺少正式卡面</small></>}
    <span>{String(n).padStart(2, "0")}</span>
  </article>)}</div>
  <div className="asset-warning"><ShieldCheck /><p>現有正式參考只覆蓋部分卡號；10、12–24 不會用其他卡冒充。</p></div></ChildFrame>;
}

export function BuddyCafe() {
  return <ChildFrame title="Buddy Café"><section className="cafe-hero"><DemoBadge label="KNOCK KNOCK!" /><h1>Peek-a-CAKE!</h1><p>照顧 Pip，同朋友留低一張只屬於你們的紀念卡。</p><div className="pet-stage"><img src="/assets/hero-3-5.webp" alt="合成示範孩子與寵物角色" /><div className="pet-stats"><span><Heart />心情 82</span><span>🍪 飽足 68</span><span>✨ 親密 74</span></div></div></section>
  <div className="buddy-actions"><button><Heart />摸摸 Pip</button><button>🍪 餵小食</button><button disabled>掃描朋友 QR</button></div>
  <div className="friend-rule"><LockKeyhole /><div><strong>影片不會自動分享</strong><p>建立朋友關係後，每段影片仍要由卡主家長逐條批准。</p></div></div></ChildFrame>;
}

export function ChildRoutePage({ kind }: { kind: string }) {
  const content: Record<string, [string, string, string]> = {
    room: ["我的小屋", "星光探險家 Mimi", "在這裏查看英雄、寵物與今期進度。"],
    library: ["Mee Library", "選擇想探索的世界", "可用主題會由家長已取得的權益決定。"],
    theatre: ["Mee Cinema", "學習影片放映室", "共用教學影片與個人化 AI 影片會清楚分開。"]
  };
  const [title, heading, detail] = content[kind];
  return <ChildFrame title={title}><div className="child-content-hero"><Play /><DemoBadge label="ROUTE READY" /><h1>{heading}</h1><p>{detail}</p></div>
  {kind === "library" && <div className="topic-grid child-topics">{topics.map(t => <article key={t.title}><StatusPill tone={t.color}>{t.status}</StatusPill><h2>{t.title}</h2><Progress value={t.progress} /></article>)}</div>}
  {kind === "theatre" && <div className="video-placeholder"><Mic /><strong>影片來源尚未連接</strong><p>接入私有 Storage 後才會顯示短效播放連結。</p></div>}
  </ChildFrame>;
}
