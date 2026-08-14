import { useState } from "react";
import {
  BookOpen, Gamepad2, Heart, MapPin, Play, ShieldCheck, Sparkles, Users,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PublicHeader, StatusPill } from "../components/UI";
import { PixelPet } from "../components/PixelPet";
import { EXAMPLE_CARDS, type KidCard, type MeeCard } from "../lib/kidCard";
import { useKidCard } from "../lib/kidCardStore";
import { stickerFor } from "../lib/stickers";
import { useStructuredData } from "../lib/seo";

// The public face of MINIMEE v2, laid out like an adult's commercial e-name
// card: one long page you scroll straight through. Avatar, then the video,
// then the actions, then the sections underneath. Parents share this link
// the way they'd share a business card — no account needed to open it,
// because a grandparent, a teacher, or whoever found a lost water bottle
// has to be able to.
export function KidCardPage() {
  const { slug } = useParams();
  const lookup = useKidCard(slug);
  const card = lookup.state === "found" ? lookup.card : null;

  useStructuredData("minimee-kid-card", card
    ? {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        name: `${card.nickname} 嘅自我介紹卡`,
        description: card.tagline,
        inLanguage: "zh-HK",
      }
    : {});

  if (lookup.state === "loading") {
    return <div className="public-page"><PublicHeader /><main className="content-page">
      <p className="lead">載入緊…</p>
    </main></div>;
  }

  if (!card) {
    // Covers both "no such card" and "the parent has unpublished it" — the
    // wording never distinguishes the two, so an unpublished card cannot be
    // confirmed to exist by probing slugs.
    return <div className="public-page"><PublicHeader /><main className="content-page">
      <h1>搵唔到呢張卡</h1>
      <p className="lead">呢條連結可能已經失效，或者卡主已經收起咗佢。</p>
      <Link className="button" to="/">返 MINIMEE 首頁</Link>
    </main></div>;
  }

  return <div className="public-page kid-card-page"><PublicHeader />
    <main className="kid-card-main">
      <KidHero card={card} />
      <KidIntroVideo card={card} />
      <KidActions card={card} />
      <KidAbout card={card} />
      <KidCollection card={card} />
      <KidTasks card={card} />
      <KidFriends card={card} />
      {card.lostMode?.enabled && <KidLostMode card={card} />}
      <KidCallToAction card={card} />
    </main>
  </div>;
}

function KidHero({ card }: { card: KidCard }) {
  return <section className="kid-hero" style={{ backgroundImage: `url(${card.scene})` }}>
    <div className="kid-hero-scrim" />
    <div className="kid-hero-inner">
      {card.isExample && <StatusPill tone="gold">示範卡 · 唔係真實小朋友</StatusPill>}
      <div className="kid-avatar-frame">
        <img className="kid-avatar" src={card.avatar} alt={`${card.nickname}嘅頭像`} />
      </div>
      <h1>{card.nickname}</h1>
      <p className="kid-tagline">{card.tagline}</p>
      <div className="kid-hero-meta">
        <span>{card.ageGroup} 歲</span>
        <span>
          {(() => { const job = stickerFor(card.dreamJob); return job ? <img className="kid-meta-sticker" src={job.src} alt="" /> : null; })()}
          想做{card.dreamJob || "…仲諗緊"}
        </span>
        <span>{card.cards.length} 張 MEE 卡</span>
      </div>
    </div>
  </section>;
}

function KidIntroVideo({ card }: { card: KidCard }) {
  const [playing, setPlaying] = useState(false);
  return <section className="kid-block kid-video-block">
    <div className="kid-video-frame">
      {card.introVideoUrl && playing
        ? <video src={card.introVideoUrl} poster={card.introVideoPoster ?? undefined} controls autoPlay playsInline />
        : <button className="kid-video-poster" onClick={() => setPlaying(true)} disabled={!card.introVideoUrl}>
            <img src={card.introVideoPoster ?? card.scene} alt="" />
            <span className="kid-play"><Play size={26} /></span>
            <span className="kid-video-label">
              {card.introVideoUrl ? `▶ 聽 ${card.nickname} 講自己` : "自我介紹片製作中…"}
            </span>
          </button>}
    </div>
    <p className="kid-note">呢段片由小朋友自己嘅答案生成，家長批核後先會出現。</p>
  </section>;
}

// The row of entry points, sitting right under the video the way an adult
// e-name card puts its contact buttons under the header.
function KidActions({ card }: { card: KidCard }) {
  const entries = [
    { key: "play", label: "學習遊戲", detail: "行 MEE 小鎮", icon: <Gamepad2 />, to: "/play" },
    { key: "cards", label: "收藏 MEE 卡", detail: `${card.cards.length} 張`, icon: <Sparkles />, to: "#collection" },
    { key: "friends", label: "好友冊", detail: "一齊儲卡", icon: <Users />, to: "#friends" },
    { key: "lost", label: "遺失模式", detail: card.lostMode?.enabled ? "已開啟" : "未開啟", icon: <MapPin />, to: "#lost" },
  ];
  return <section className="kid-actions">
    {entries.map(entry => (
      entry.to.startsWith("#")
        ? <a className="kid-action" key={entry.key} href={entry.to}>
            <span className="kid-action-icon">{entry.icon}</span>
            <strong>{entry.label}</strong><small>{entry.detail}</small>
          </a>
        : <Link className="kid-action" key={entry.key} to={entry.to}>
            <span className="kid-action-icon">{entry.icon}</span>
            <strong>{entry.label}</strong><small>{entry.detail}</small>
          </Link>
    ))}
  </section>;
}

function KidAbout({ card }: { card: KidCard }) {
  if (!card.about && card.likes.length === 0) return null;
  return <section className="kid-block">
    <h2><BookOpen size={18} />關於我</h2>
    {card.about && <p className="kid-about">{card.about}</p>}
    {card.likes.length > 0 && <>
      <h3>我鍾意…</h3>
      {/* A sticker is matched to the word by name, so a like the artwork does
          not cover still shows — just with a heart instead of a picture. */}
      <ul className="kid-likes">{card.likes.map(like => {
        const sticker = stickerFor(like);
        return <li key={like} className={sticker ? "has-sticker" : undefined}>
          {sticker ? <img src={sticker.src} alt="" /> : <Heart size={13} />}
          {like}
        </li>;
      })}</ul>
    </>}
  </section>;
}

function KidCollection({ card }: { card: KidCard }) {
  return <section className="kid-block" id="collection">
    <h2><Sparkles size={18} />我嘅 MEE 卡收藏</h2>
    <p className="kid-note">每完成一個任務就解鎖一張。閃卡係限定，唔可以重抽。</p>
    {card.cards.length === 0
      ? <p className="kid-empty">仲未有卡，快啲去 MEE 小鎮執啦！</p>
      : <div className="kid-card-grid">{card.cards.map(mee => <MeeCardTile key={mee.id} card={mee} />)}</div>}
  </section>;
}

function MeeCardTile({ card }: { card: MeeCard }) {
  return <article className={card.rarity === "flash" ? "mee-card flash" : "mee-card"}>
    <img src={card.art} alt="" />
    <div className="mee-card-body">
      <div className="mee-card-head">
        <span className="mee-code">{card.code}</span>
        {card.rarity === "flash" && <StatusPill tone="gold">FLASH</StatusPill>}
      </div>
      <strong>{card.name}</strong>
      <small>{card.earnedFor}</small>
    </div>
  </article>;
}

function KidTasks({ card }: { card: KidCard }) {
  if (card.tasks.length === 0) return null;
  return <section className="kid-block">
    <h2><Gamepad2 size={18} />仲差呢啲任務</h2>
    <ul className="kid-task-list">{card.tasks.map(task => <li key={task.id}>
      <strong>{task.title}</strong><small>{task.detail}</small>
    </li>)}</ul>
  </section>;
}

function KidFriends({ card }: { card: KidCard }) {
  return <section className="kid-block" id="friends">
    <h2><Users size={18} />好友冊</h2>
    <p className="kid-note">
      朋友要掃 QR 碼、再由雙方家長批准先加得到。{card.nickname} 嘅影片同相片，
      每一件都要家長逐件批准先睇得到。
    </p>
    <p className="kid-empty">好友冊功能準備緊。</p>
  </section>;
}

function KidLostMode({ card }: { card: KidCard }) {
  if (!card.lostMode) return null;
  return <section className="kid-block kid-lost-block" id="lost">
    <h2><MapPin size={18} />執到我嘅嘢？</h2>
    <p className="kid-about">{card.lostMode.message}</p>
    {/* A real card never ships its lost-mode token to the browser — the
        finder reaches the parent by scanning the QR sticker on the item,
        which carries /lost/:token. Only the bundled examples have a token
        here, so the demo link stays clickable. */}
    {card.lostMode.token
      ? <Link className="button" to={`/lost/${card.lostMode.token}`}>聯絡家長（唔會顯示電話號碼）</Link>
      : <p className="kid-note">掃描物品上面嘅 MINIMEE QR 貼紙就可以聯絡家長。</p>}
    <p className="kid-note">
      <ShieldCheck size={13} />
      訊息經 MINIMEE 轉交，家長嘅電郵同電話唔會公開俾任何人。
    </p>
  </section>;
}

function KidCallToAction({ card }: { card: KidCard }) {
  return <section className="kid-cta">
    <PixelPet kind="watermelon-shiba" facing="down" scale={4} />
    <h2>想幫你嘅小朋友整一張？</h2>
    <p>MINIMEE 係小朋友版嘅電子名片：一條連結講齊佢係邊個、鍾意咩、儲咗咩，仲可以開遺失模式。</p>
    <div className="kid-cta-actions">
      <Link className="button" to="/register">免費開始</Link>
      <Link className="button secondary" to="/pricing">睇方案</Link>
    </div>
    {card.isExample && <p className="kid-note">
      你而家睇緊嘅係示範卡。想睇另一個例子？
      {EXAMPLE_CARDS.filter(other => other.slug !== card.slug).map(other =>
        <Link key={other.slug} to={`/kid/${other.slug}`}> {other.nickname} 嘅卡</Link>)}
    </p>}
  </section>;
}
