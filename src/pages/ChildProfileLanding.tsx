import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, Play, ShieldCheck } from "lucide-react";
import { usePublicProfile } from "../lib/profileStore";
import { useStickerWall, type WallSticker } from "../lib/stickerStore";
import { useAuth } from "../contexts/AuthContext";
import { useFamily } from "../contexts/FamilyContext";
import { StickerWall } from "../components/profile/StickerWall";
import { StickerPicker } from "../components/profile/StickerPicker";
import { StickerDetailPanel } from "../components/profile/StickerDetailPanel";
import {
  ChildProfileHero, ChildQuote, DreamPanel, FavouritesPanel,
  FriendsPreview, LearningPreview, MeeCollectionPreview,
} from "../components/profile/ProfilePanels";
import { addSticker, type WallCategory } from "../lib/stickerStore";
import { activeFriends } from "../data/mock";
import type { StickerCategory } from "../lib/stickers";

// 我的小屋 — the child's scrapbook profile.
//
// One page, two audiences, and deliberately **one visual system with two
// permission models**:
//
//   • A visitor at /kid/:slug reads through `kid_card_public`, which applies
//     the per-field privacy switches and withholds any photo that was not
//     explicitly turned on.
//   • The owning parent, signed in, sees the same layout with the private
//     fields present and an edit mode.
//
// The two are never the same query. A visitor is not given private data and
// told not to render it — they are not given it at all.

export function ChildProfileLanding() {
  const { slug } = useParams();
  const lookup = usePublicProfile(slug);
  const auth = useAuth();
  const { children } = useFamily();

  const [openSticker, setOpenSticker] = useState<WallSticker | null>(null);
  const [picking, setPicking] = useState<WallCategory | null>(null);
  const [editing, setEditing] = useState(false);

  const profile = lookup.state === "found" ? lookup.profile : null;

  // Whether the signed-in parent owns this card. Ownership decides edit mode;
  // being logged in as somebody else grants nothing.
  const owned = useMemo(
    () => Boolean(auth.user && profile && children.some(child => child.nickname === profile.nickname)),
    [auth.user, profile, children],
  );

  // Owners read the wall directly so private notes and photos are present.
  // Visitors keep the filtered copy that came back from the public function.
  const ownWall = useStickerWall(owned && profile ? profile.id : null);
  const stickers = owned && ownWall.stickers.length > 0
    ? ownWall.stickers
    : (lookup.state === "found" ? lookup.stickers : []);

  if (lookup.state === "loading") {
    return <main className="scrapbook-page"><p className="panel-empty">載入緊…</p></main>;
  }
  if (lookup.state === "missing" || !profile) {
    return (
      <main className="scrapbook-page">
        <section className="paper-panel">
          <h1>搵唔到呢個檔案</h1>
          <p className="panel-empty">呢條連結可能已經失效，或者卡主已經收起咗佢。</p>
          <Link className="tape-button" to="/">返 MINIMEE 首頁</Link>
        </section>
      </main>
    );
  }

  const byCategory = (category: WallCategory) => stickers.filter(item => item.category === category);
  const featured = stickers.filter(item => item.size === "xl");

  async function pick(label: string, category: StickerCategory) {
    if (!picking || !profile) return;
    await addSticker(profile.id, picking, label, picking === "favourite" ? "xl" : "m");
    setPicking(null);
    await ownWall.refresh();
  }

  return (
    <main className="scrapbook-page">
      <div className="scrapbook-room" aria-hidden />

      <div className="scrapbook-topbar">
        <Link className="round-button" to="/" aria-label="返首頁">←</Link>
        {owned && (
          <button
            type="button"
            className={editing ? "round-button on" : "round-button"}
            onClick={() => setEditing(value => !value)}
          >
            {editing ? "完成" : "✎ 編輯"}
          </button>
        )}
      </div>

      <div className="scrapbook-spread">
        <div className="scrapbook-column">
          {profile.isExample && (
            <p className="example-flag">示範卡 · 唔係真實小朋友</p>
          )}

          <ChildProfileHero
            nickname={profile.nickname}
            age={profile.age}
            tagline={profile.tagline}
            avatar={profile.avatar}
            heroId={profile.heroId}
            featured={featured}
            onOpenSticker={setOpenSticker}
          />

          {profile.about && (
            <section className="paper-panel about-panel">
              <header className="panel-head"><h2 className="panel-tab"><span aria-hidden>✿</span>這就是我</h2></header>
              <p className="about-text">{profile.about}</p>
              {profile.school && <p className="about-meta">🏫 {profile.school}</p>}
            </section>
          )}

          <StickerWall
            title="我的日常" tab="☀"
            stickers={byCategory("activity")}
            editing={editing && owned}
            emptyHint="仲未揀日常做緊乜。"
            onOpen={setOpenSticker}
            onChanged={ownWall.refresh}
            onAdd={() => setPicking("activity")}
          />

          <StickerWall
            title="我的興趣" tab="★"
            stickers={byCategory("interest")}
            editing={editing && owned}
            emptyHint="仲未揀興趣。"
            onOpen={setOpenSticker}
            onChanged={ownWall.refresh}
            onAdd={() => setPicking("interest")}
          />

          {/* Favourites and the dream sit side by side once there is room,
              as in the reference — neither fills a full-width panel on its
              own without looking like a mostly empty box. */}
          <div className="panel-pair">
            <FavouritesPanel favourites={profile.favourites} />
            <DreamPanel dream={profile.dreamJob} />
          </div>
        </div>

        <div className="scrapbook-column narrow">
          {openSticker ? (
            <StickerDetailPanel
              key={openSticker.id}
              sticker={openSticker}
              cardId={owned ? profile.id : null}
              editing={editing && owned}
              onClose={() => setOpenSticker(null)}
              onChanged={ownWall.refresh}
            />
          ) : (
            <section className="paper-panel video-panel">
              <header className="panel-head"><h2 className="panel-tab"><span aria-hidden>▶</span>自我介紹</h2></header>
              {profile.introVideoUrl
                ? <video src={profile.introVideoUrl} poster={profile.introVideoPoster ?? undefined} controls playsInline />
                : <button className="video-pending" disabled>
                    <Play size={18} />自我介紹片製作中…
                  </button>}
            </section>
          )}

          <MeeCollectionPreview cards={lookup.cards} albumTo="/child/albums" />

          <LearningPreview
            topic={null}
            done={lookup.cards.length}
            total={Math.max(lookup.cards.length, 4)}
            to="/play"
          />

          <FriendsPreview
            friends={activeFriends.slice(0, 6).map((friend, index) => ({
              id: String(index),
              name: String((friend as { name?: string }).name ?? "朋友"),
              avatar: "/assets/hero-3-5.webp",
            }))}
          />

          {profile.lostModeEnabled && (
            <section className="paper-panel lost-panel">
              <header className="panel-head"><h2 className="panel-tab"><MapPin size={14} />執到我嘅嘢？</h2></header>
              <p>{profile.lostModeMessage || "如果你執到我嘅嘢，唔該聯絡我屋企人，多謝你！"}</p>
              {/* Only the bundled demos carry a token, so only they get a
                  clickable link. A real card's finder scans the QR sticker. */}
              {profile.lostModeToken
                ? <Link className="tape-button" to={`/lost/${profile.lostModeToken}`}>聯絡家長（唔會顯示電話號碼）</Link>
                : <p className="panel-note">掃描物品上面嘅 MINIMEE QR 貼紙就可以聯絡家長。</p>}
              <p className="panel-note">
                <ShieldCheck size={12} /> 訊息經 MINIMEE 轉交，家長嘅電郵同電話唔會公開俾任何人。
              </p>
            </section>
          )}
        </div>
      </div>

      <ChildQuote quote={profile.quote} />

      <nav className="scrapbook-dock">
        <Link to="/" className="dock-item"><span aria-hidden>🏠</span>我的小屋</Link>
        <Link to="/play" className="dock-item"><span aria-hidden>🗺️</span>冒險地圖</Link>
        <Link to="/child/albums" className="dock-item"><span aria-hidden>🃏</span>MEE 收藏</Link>
        <Link to="/pricing" className="dock-item"><span aria-hidden>⭐</span>任務</Link>
      </nav>

      {picking && (
        <StickerPicker
          target={picking}
          chosen={byCategory(picking).map(item => item.label)}
          onPick={(label, category) => void pick(label, category)}
          onClose={() => setPicking(null)}
        />
      )}

    </main>
  );
}
