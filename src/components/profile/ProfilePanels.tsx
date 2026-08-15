import { Link } from "react-router-dom";
import { findHero, TOWN_PETS } from "../../lib/characters";
import { stickerFor } from "../../lib/stickers";
import { ageLabel, type DerivedAge } from "../../lib/age";
import type { WallSticker } from "../../lib/stickerStore";
import type { MeeCard } from "../../lib/kidCard";

// The smaller pieces of the scrapbook. Each is a paper panel with its own
// weight: the hero is the anchor, the walls are the body, and MEE / learning /
// friends are deliberately small — this is a self-introduction, not a
// learning dashboard, and giving every section equal height was the specific
// failure the spec calls out.

// ---------------------------------------------------------------------------

export interface ProfileHeroProps {
  nickname: string;
  age: DerivedAge | null;
  tagline: string;
  avatar: string;
  heroId?: string | null;
  /** Two to four stickers pinned around the portrait. */
  featured: WallSticker[];
  onOpenSticker?: (sticker: WallSticker) => void;
}

export function ChildProfileHero({
  nickname, age, tagline, avatar, heroId, featured, onOpenSticker,
}: ProfileHeroProps) {
  const hero = findHero(heroId);
  // One pet keeps the child company in the corner, chosen from the child's own
  // name so it is the same friend every visit rather than a random animal.
  const companion = TOWN_PETS[nickname.length % TOWN_PETS.length];

  return (
    <section className="profile-hero">
      <div className="hero-portrait">
        <div className="tape tape-a" aria-hidden />
        <div className="tape tape-b" aria-hidden />
        <img className="hero-avatar" src={avatar} alt={`${nickname} 嘅頭像`} />
        <div className="hero-name-banner">
          {/* The child's name is the page's heading. It looks like a banner,
              but a profile with no h1 is a profile a screen reader cannot
              announce. */}
          <h1>{nickname}</h1>
          {age && <em>{ageLabel(age)}</em>}
        </div>
      </div>

      <div className="hero-bubble">
        <p>{tagline || `嗨～我係${nickname}！`}</p>
        <img className="hero-companion" src={companion.art} alt="" />
      </div>

      {featured.length > 0 && (
        <div className="hero-featured">
          {/* The dotted connector is drawn in CSS, not as an arrow — it should
              read as stitching between the portrait and what it likes. */}
          {featured.slice(0, 4).map(sticker => (
            <button
              key={sticker.id}
              type="button"
              className={sticker.art ? "hero-pin" : "hero-pin wordonly"}
              onClick={() => onOpenSticker?.(sticker)}
              aria-label={sticker.label}
            >
              {sticker.art
                ? <img src={sticker.art} alt="" />
                : <span className="sticker-wordmark">{sticker.label}</span>}
            </button>
          ))}
        </div>
      )}

      <img className="hero-mee" src={hero.art} alt="" aria-hidden />
    </section>
  );
}

// ---------------------------------------------------------------------------

export interface Favourites {
  animal: string | null;
  food: string | null;
  colour: string | null;
  place: string | null;
}

export function FavouritesPanel({ favourites }: { favourites: Favourites }) {
  const slots: Array<[string, string | null]> = [
    ["最愛動物", favourites.animal],
    ["最愛食物", favourites.food],
    ["最愛顏色", favourites.colour],
    ["最愛地方", favourites.place],
  ];
  if (slots.every(([, value]) => !value)) return null;

  return (
    <section className="paper-panel favourites-panel">
      <header className="panel-head"><h2 className="panel-tab"><span aria-hidden>💛</span>我的最愛</h2></header>
      <div className="favourite-grid">
        {slots.map(([label, value]) => {
          const art = value ? stickerFor(value) : null;
          return (
            <div className="favourite-slot" key={label}>
              <span className="favourite-label">{label}</span>
              {/* Without artwork the square art well is just a big empty box,
                  so the word takes the slot instead of sitting inside one. */}
              <div className={art ? "favourite-art" : "favourite-art wordonly"}>
                {art
                  ? <img src={art.src} alt="" />
                  : <span className="favourite-word">{value || "—"}</span>}
              </div>
              {art && <small>{value}</small>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function DreamPanel({ dream }: { dream: string | null }) {
  const art = dream ? stickerFor(dream) : null;
  // "Not sure yet" is a real answer, not a blank field — so it gets its own
  // playful treatment rather than looking like something went missing.
  const undecided = !dream || dream === "未諗到";

  return (
    <section className="paper-panel dream-panel">
      <header className="panel-head"><h2 className="panel-tab"><span aria-hidden>⭐</span>我的夢想</h2></header>
      {undecided ? (
        <div className="dream-bubbles">
          <span className="dream-bubble a">仲諗緊…</span>
          <span className="dream-bubble b">咩都想試！</span>
          <span className="dream-bubble c">好多選擇呀</span>
        </div>
      ) : (
        <div className={art ? "dream-body" : "dream-body wordonly"}>
          {art && <img src={art.src} alt="" />}
          <strong>{dream}</strong>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

export function MeeCollectionPreview({ cards, albumTo }: { cards: MeeCard[]; albumTo: string }) {
  return (
    <section className="paper-panel mee-preview">
      <header className="panel-head">
        <h2 className="panel-tab"><span aria-hidden>🃏</span>我的 MEE 收藏</h2>
        <Link className="tape-button" to={albumTo}>查看全部</Link>
      </header>
      {cards.length === 0 ? (
        <p className="panel-empty">仲未有卡，去 MEE 小鎮執啦！</p>
      ) : (
        <div className="mee-strip">
          {cards.slice(0, 3).map(card => (
            <article className={card.rarity === "flash" ? "mee-mini flash" : "mee-mini"} key={card.id}>
              <img src={card.art} alt="" />
              <span>{card.name}</span>
              {/* The code is how a child tells two cards of the same animal
                  apart, and how they say which one they want to trade. */}
              <small className="mee-code">{card.code}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

export function LearningPreview({ topic, done, total, to }: {
  topic: string | null; done: number; total: number; to: string;
}) {
  if (!topic && total === 0) return null;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <section className="paper-panel learning-preview">
      <header className="panel-head"><h2 className="panel-tab"><span aria-hidden>🚀</span>最近學緊</h2></header>
      <div className="learning-line">
        <strong>{topic ?? "仲未開始"}</strong>
        <div className="learning-bar"><span style={{ width: `${percent}%` }} /></div>
        <small>{done} / {total}</small>
      </div>
      <Link className="tape-button" to={to}>繼續學習</Link>
    </section>
  );
}

// ---------------------------------------------------------------------------

export interface FriendPreview { id: string; name: string; avatar: string }

export function FriendsPreview({ friends }: { friends: FriendPreview[] }) {
  return (
    <section className="paper-panel friends-preview">
      <header className="panel-head"><h2 className="panel-tab"><span aria-hidden>💌</span>我的朋友</h2></header>
      {friends.length === 0 ? (
        <p className="panel-empty">仲未加到好友。</p>
      ) : (
        <div className="friend-row">
          {friends.slice(0, 6).map(friend => (
            <div className="friend-chip" key={friend.id}>
              <img src={friend.avatar} alt="" />
              <span>{friend.name}</span>
            </div>
          ))}
        </div>
      )}
      {/* The friends backend does not exist yet, so this says so rather than
          presenting sample rows as though they were real friendships. */}
      <p className="panel-note">好友冊功能製作緊。</p>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function ChildQuote({ quote }: { quote: string | null }) {
  if (!quote) return null;
  return (
    <section className="quote-note">
      <span className="pin" aria-hidden />
      <p>{quote}</p>
    </section>
  );
}

// ---------------------------------------------------------------------------

/**
 * One switch for one field. The spec forbids a single global visibility
 * toggle: a parent may well want the dream public and the school private, and
 * one switch cannot say that.
 */
export function PrivacyFieldSwitch({ label, hint, isPublic, onChange }: {
  label: string;
  hint?: string;
  isPublic: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className={isPublic ? "privacy-switch on" : "privacy-switch"}>
      <input type="checkbox" checked={isPublic} onChange={event => onChange(event.target.checked)} />
      <span className="privacy-track" aria-hidden><em /></span>
      <span className="privacy-text">
        <strong>{label}</strong>
        <small>{isPublic ? "公開 — 有連結嘅人睇到" : "私人 — 只有你睇到"}</small>
        {hint && <small className="privacy-hint">{hint}</small>}
      </span>
    </label>
  );
}
