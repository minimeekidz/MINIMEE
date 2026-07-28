import { useState } from "react";
import { ChevronLeft, Heart, LockKeyhole, Mic, Moon, Play, ShieldCheck, Sparkles, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { DemoBadge, Progress, StatusPill } from "../components/UI";
import { activeFriends, cards, demoChild, friendHistory, locations, topics } from "../data/mock";

function ChildFrame({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="child-page">
      <div className="child-topbar">
        <Link to="/child" aria-label="返回 Pixel World"><ChevronLeft /></Link>
        <div><small>MINIMEE PIXEL WORLD</small><strong>{title}</strong></div>
        <Link to="/parent-gate" className="parent-gate"><ShieldCheck /><span>家長</span></Link>
      </div>
      <main className="child-frame">{children}</main>
      <div className="child-dock">
        <Link to="/child"><span>🗺️</span>小鎮</Link><Link to="/child/hero-studio"><span>⚡</span>任務</Link>
        <Link to="/child/albums"><span>🃏</span>卡冊</Link><Link to="/child/buddy"><span>☕</span>朋友</Link>
      </div>
    </div>
  );
}

function SceneHero({
  image,
  eyebrow,
  title,
  detail,
  children,
  className = ""
}: {
  image: string;
  eyebrow: string;
  title: string;
  detail: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`scene-hero ${className}`} style={{ backgroundImage: `url(${image})` }}>
      <div className="scene-shade" />
      <div className="scene-copy">
        <DemoBadge label={eyebrow} />
        <h1>{title}</h1>
        <p>{detail}</p>
        {children}
      </div>
    </section>
  );
}

export function PixelWorld() {
  const [night, setNight] = useState(false);
  return <ChildFrame title={`你好，${demoChild.displayName}！`}>
    <SceneHero
      image={night ? "/assets/town-night.webp" : "/assets/town-morning.webp"}
      eyebrow={night ? "PIXEL WORLD · NIGHT" : "PIXEL WORLD · MORNING"}
      title="今天想去哪裏？"
      detail="完成最後一個任務，就可以砌好今期 Mystery Shards。"
      className="town-scene"
    >
      <button className="time-toggle" onClick={() => setNight(v => !v)}>
        {night ? <Sun /> : <Moon />}{night ? "轉到早晨" : "轉到夜晚"}
      </button>
      <Progress value={75} label="城市小冒險" />
    </SceneHero>
    <section className="location-grid">{locations.map(l => <Link to={l.path} key={l.name}><span>{l.emoji}</span><div><strong>{l.name}</strong><small>{l.detail}</small></div></Link>)}</section>
    <Link className="coming-soon harbor-entry" to="/child/harbor-market"><span>⚓</span><div><strong>碼頭市集</strong><small>前往親子天地與家長管理入口</small></div><span>→</span></Link>
  </ChildFrame>;
}

export function HeroStudio() {
  const nodes = ["港鐵", "紅綠燈", "巴士", "天星小輪"];
  return <ChildFrame title="Hero Studio">
  <SceneHero image="/assets/hero-studio-interior.webp" eyebrow="HERO STUDIO" title="差一塊就完成！" detail="每日詞語的學習入口，完成四個節點便會解鎖影片任務。" className="interior-scene">
    <div className="scene-links"><Link to="/child/theatre">🎬 Mee Cinema</Link><Link to="/child/library">📚 Mee Library</Link></div>
  </SceneHero>
  <div className="studio-head"><StatusPill tone="gold">城市小冒險</StatusPill><h1>今日學習路線</h1><p>每個詞語都有一條三選一問題，再由家長 PIN 確認。</p></div>
  <div className="node-path">{nodes.map((n, i) => <article className={i < 3 ? "complete" : "current"} key={n}><span>{i < 3 ? "✓" : i + 1}</span><div><small>NODE 0{i + 1}</small><strong>{n}</strong></div><button disabled={i !== 3}>{i < 3 ? "完成" : "開始"}</button></article>)}</div>
  <div className="shard-panel"><Sparkles /><div><strong>Mystery Shards</strong><p>四塊集齊後只會解鎖影片任務，不會立即派發 MEE Card。</p></div><div className="mini-shards"><i /><i /><i /><i className="missing" /></div></div></ChildFrame>;
}

export function AlbumsPage() {
  return <ChildFrame title="MEE Album House">
  <SceneHero image="/assets/album-house-interior.webp" eyebrow="MEE ALBUM HOUSE" title="我的童年收藏" detail="每次完成主題，童年故事便會留在固定卡位。" className="interior-scene" />
  <div className="studio-head"><StatusPill>MEE BOOK 1–4</StatusPill><h1>01–24 固定卡位</h1><p>未有正式圖檔的卡位會清楚標示缺少素材。</p></div>
  <div className="album-grid">{Array.from({ length: 24 }, (_, i) => i + 1).map(n => <article className={cards[n] ? "unlocked" : "locked"} key={n}>
    {cards[n] ? <img src={cards[n]} alt={`MEE Card ${String(n).padStart(2, "0")} 示範`} /> : <><LockKeyhole /><small>缺少正式卡面</small></>}
    <span>{String(n).padStart(2, "0")}</span>
  </article>)}</div>
  <div className="asset-warning"><ShieldCheck /><p>現有正式參考只覆蓋部分卡號；10、12–24 不會用其他卡冒充。</p></div></ChildFrame>;
}

export function BuddyCafe() {
  return <ChildFrame title="Buddy Café">
  <SceneHero image="/assets/buddy-cafe-interior.webp" eyebrow="KNOCK KNOCK!" title="Peek-a-CAKE!" detail="照顧 Pip，同朋友留低一張只屬於你們的紀念卡。" className="interior-scene">
    <div className="pet-stats scene-stats"><span><Heart />心情 82</span><span>🍪 飽足 68</span><span>✨ 親密 74</span></div>
  </SceneHero>
  <div className="buddy-actions"><button><Heart />摸摸 Pip</button><button>🍪 餵小食</button><button disabled>掃描朋友 QR</button></div>
  <section className="child-friends" aria-label="朋友">
    <div className="child-friend-heading"><strong>我的朋友</strong><span>{activeFriends.length} 位已連接</span></div>
    {activeFriends.map(friend => <div className="child-friend-card" key={friend.id}><span>{friend.icon}</span><strong>{friend.displayName}</strong><small>影片要由家長逐段批准</small></div>)}
    <div className="child-history-line">
      <small>以前認識過</small>
      {friendHistory.map(friend => <span key={friend.id}>{friend.icon} {friend.displayName}</span>)}
    </div>
    <p className="quota-note">歷史名字只是一行紀錄，不佔朋友相簿位置。</p>
  </section>
  <div className="friend-rule"><LockKeyhole /><div><strong>影片不會自動分享</strong><p>建立朋友關係後，每段影片仍要由卡主家長逐條批准。</p></div></div></ChildFrame>;
}

export function ChildRoutePage({ kind }: { kind: string }) {
  const content: Record<string, [string, string, string]> = {
    room: ["我的小屋", "星光探險家 Mimi", "在這裏查看英雄、寵物與今期進度。"],
    library: ["Mee Library", "選擇想探索的世界", "可用主題會由家長已取得的權益決定。"],
    theatre: ["Mee Cinema", "學習影片放映室", "共用教學影片與個人化 AI 影片會清楚分開。"]
  };
  const [title, heading, detail] = content[kind];
  const images: Record<string, string> = {
    room: "/assets/my-home.webp",
    library: "/assets/mee-library.webp",
    theatre: "/assets/mee-cinema.webp"
  };
  return <ChildFrame title={title}>
  <SceneHero image={images[kind]} eyebrow={title} title={heading} detail={detail} className="interior-scene">
    {kind === "theatre" && <button className="scene-play" disabled><Play />待影片來源連接</button>}
  </SceneHero>
  {kind === "library" && <div className="topic-grid child-topics">{topics.map(t => <article key={t.title}><StatusPill tone={t.color}>{t.status}</StatusPill><h2>{t.title}</h2><Progress value={t.progress} /></article>)}</div>}
  {kind === "theatre" && <div className="video-placeholder"><Mic /><strong>影片來源尚未連接</strong><p>接入私有 Storage 後才會顯示短效播放連結。</p></div>}
  </ChildFrame>;
}

export function HarborMarket() {
  return <ChildFrame title="碼頭市集">
    <SceneHero image="/assets/harbor-market.webp" eyebrow="PARENT HARBOR" title="前往親子天地" detail="家長在這裏管理孩子檔案、主題、進度、訂閱及私隱設定。" className="harbor-scene">
      <Link className="button harbor-button" to="/parent/dashboard"><ShieldCheck />以家長身份進入</Link>
    </SceneHero>
    <section className="parent-place-preview" style={{ backgroundImage: "url(/assets/parent-child-space.webp)" }}>
      <div><DemoBadge label="親子天地" /><h2>一起閱讀、一起成長</h2><p>親子資源與帳戶工具會在家長驗證後開啟。</p></div>
    </section>
  </ChildFrame>;
}
