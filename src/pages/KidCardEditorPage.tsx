import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Eye, EyeOff, MapPin, Plus, Save, ShieldCheck, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { DashboardHeader, EmptyState, Shell, StatusPill } from "../components/UI";
import { HEROES, TOWN_PETS } from "../lib/characters";
import { CATEGORY_LABELS, stickersIn, type StickerCategory } from "../lib/stickers";
import { useAuth } from "../contexts/AuthContext";
import { useFamily } from "../contexts/FamilyContext";
import {
  createCard, loadEditableCard, mintLostToken, saveCard, seedStarterTasks, setPublished,
  type EditableCard,
} from "../lib/kidCardStore";

// Scenes come from the bundled illustrated set rather than an upload, so a
// card can be made public without ever putting a real photo of a child on a
// public URL. Photo upload, if it ever happens, needs its own consent flow.
const SCENES = [
  ["/assets/album-ocean.webp", "海底世界"],
  ["/assets/town-morning.webp", "早晨小鎮"],
  ["/assets/town-night.webp", "夜晚小鎮"],
  ["/assets/harbor-market.webp", "碼頭市集"],
  ["/assets/hero-studio-interior.webp", "Hero Studio"],
  ["/assets/my-home.webp", "我的小屋"],
  ["/assets/mee-library.webp", "MEE 圖書館"],
  ["/assets/buddy-cafe-interior.webp", "Paw Café"],
] as const;

export function KidCardEditorPage() {
  const { id: childId } = useParams();
  const { user } = useAuth();
  const { children, loading: familyLoading } = useFamily();
  const child = children.find(candidate => candidate.id === childId);

  const [card, setCard] = useState<EditableCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [likeDraft, setLikeDraft] = useState("");

  const load = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    setCard(await loadEditableCard(childId));
    setLoading(false);
  }, [childId]);

  useEffect(() => { void load(); }, [load]);

  function patch(changes: Partial<EditableCard>) {
    setCard(current => (current ? { ...current, ...changes } : current));
    setSaved(false);
  }

  async function handleCreate() {
    if (!childId || !user || !child) return;
    setBusy(true);
    setError(null);
    const result = await createCard({
      childId, parentId: user.id, nickname: child.nickname, ageGroup: child.age_group,
    });
    if (!result.ok) { setBusy(false); setError("未能建立卡片，請稍後再試。"); return; }
    // Seed the starter tasks so the child opens MEE 小鎮 to something to do
    // rather than an empty list. A failure here is not worth blocking the
    // card on — the card is the deliverable, tasks can be retried.
    await seedStarterTasks(result.card.id);
    setBusy(false);
    setCard(result.card);
  }

  async function handleSave() {
    if (!card) return;
    setBusy(true);
    setError(null);
    const result = await saveCard(card);
    setBusy(false);
    if (!result.ok) { setError("未能儲存，請稍後再試。"); return; }
    setSaved(true);
    await load();
  }

  async function handlePublishToggle() {
    if (!card) return;
    setBusy(true);
    setError(null);
    const result = await setPublished(card.id, !card.published);
    setBusy(false);
    if (!result.ok) { setError("未能更改發布狀態，請稍後再試。"); return; }
    await load();
  }

  if (familyLoading || loading) {
    return <Shell surface="parent"><DashboardHeader title="自我介紹卡" />
      <EmptyState title="載入中" detail="正在讀取卡片資料。" /></Shell>;
  }

  if (!child) {
    return <Shell surface="parent"><DashboardHeader title="自我介紹卡" />
      <EmptyState title="找不到這名孩子" detail="這個檔案不存在，或不屬於目前登入的家長帳戶。" /></Shell>;
  }

  if (!card) {
    return <Shell surface="parent">
      <DashboardHeader title={`${child.nickname} 的自我介紹卡`} />
      <EmptyState
        title="仲未有卡"
        detail={`幫 ${child.nickname} 整一張自我介紹卡，就好似大人嘅電子名片咁。建立之後唔會即刻公開 —— 你填好內容、自己睇過，撳「發布」先至有人開得到。`}
      />
      {error && <div className="payment-result failed" role="alert"><X /><div><strong>建立失敗</strong><p>{error}</p></div></div>}
      <div className="subscription-actions">
        <button className="button" onClick={() => void handleCreate()} disabled={busy}>
          <Plus />{busy ? "建立中…" : "建立自我介紹卡"}
        </button>
      </div>
    </Shell>;
  }

  const cardUrl = `${window.location.origin}/kid/${card.slug}`;

  return <Shell surface="parent">
    <DashboardHeader title={`${child.nickname} 的自我介紹卡`} />

    {error && <div className="payment-result failed" role="alert"><X /><div><strong>操作失敗</strong><p>{error}</p></div></div>}

    <section className={card.published ? "publish-bar live" : "publish-bar"}>
      <div>
        <StatusPill tone={card.published ? "green" : "gold"}>
          {card.published ? "已公開" : "未公開"}
        </StatusPill>
        <p>
          {card.published
            ? "任何人有呢條連結都開到呢張卡。"
            : "而家只有你自己睇到。撳「發布」之後，有連結嘅人就開得到。"}
        </p>
      </div>
      <button
        className={card.published ? "button secondary" : "button"}
        onClick={() => void handlePublishToggle()}
        disabled={busy}
      >
        {card.published ? <><EyeOff size={16} />收返起</> : <><Eye size={16} />發布</>}
      </button>
    </section>

    {card.published && <section className="card-link-row">
      <code>{cardUrl}</code>
      <button className="button small secondary" onClick={() => void navigator.clipboard?.writeText(cardUrl)}>
        <Copy size={15} />複製連結
      </button>
      <Link className="button small" to={`/kid/${card.slug}`}>睇下個樣</Link>
    </section>}

    <section className="editor-grid">
      <label>
        <span>顯示名稱</span>
        <input value={card.displayName} maxLength={40}
          onChange={event => patch({ displayName: event.target.value })} />
        <small>呢個名會公開，可以用暱稱，唔一定要用真名。</small>
      </label>

      <label>
        <span>一句自我介紹</span>
        <input value={card.tagline} maxLength={120} placeholder="例如：我叫Mimi，我最鍾意畫海底世界！"
          onChange={event => patch({ tagline: event.target.value })} />
      </label>

      <label className="editor-wide">
        <span>關於我</span>
        <textarea value={card.about} maxLength={1000} rows={5}
          placeholder="用小朋友自己嘅語氣寫，講下佢做緊咩、識咩、有咩趣事。"
          onChange={event => patch({ about: event.target.value })} />
        <small>{card.about.length} / 1000</small>
      </label>

      <label>
        <span>夢想職業</span>
        <input value={card.dreamJob} maxLength={60} placeholder="例如：海洋生物學家"
          onChange={event => patch({ dreamJob: event.target.value })} />
      </label>

      <div className="editor-wide">
        <span className="editor-label">揀個職業貼紙</span>
        <StickerPicker
          category="job"
          chosen={card.dreamJob ? [card.dreamJob] : []}
          onPick={label => patch({ dreamJob: label })}
        />
      </div>

      <div className="editor-wide">
        <span className="editor-label">卡片頭像</span>
        <p className="editor-help">
          揀一個圖案代表小朋友。<strong>唔會用真人相</strong> —— 張卡係公開連結，
          小朋友嘅相唔應該擺喺公開網址度。
        </p>
        <div className="hero-picker">
          {[...HEROES.map(hero => [hero.art, hero.nameZh] as const),
            ...TOWN_PETS.map(pet => [pet.art, pet.nameZh] as const)].map(([src, label]) => (
            <button
              key={src}
              className={card.avatarUrl === src ? "hero-option selected" : "hero-option"}
              onClick={() => patch({ avatarUrl: src })}
              aria-pressed={card.avatarUrl === src}
            >
              <img src={src} alt="" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="editor-wide">
        <span className="editor-label">我鍾意…</span>
        <StickerPicker
          category="interest"
          chosen={card.likes}
          onPick={label => patch({ likes: card.likes.includes(label) ? card.likes : [...card.likes, label] })}
        />
        <div className="like-chips">
          {card.likes.map(like => (
            <button key={like} className="like-chip" onClick={() => patch({ likes: card.likes.filter(item => item !== like) })}>
              {like}<X size={13} />
            </button>
          ))}
        </div>
        <div className="like-add">
          <input
            value={likeDraft}
            maxLength={20}
            placeholder="加一樣鍾意嘅嘢"
            onChange={event => setLikeDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const value = likeDraft.trim();
              if (value && !card.likes.includes(value)) patch({ likes: [...card.likes, value] });
              setLikeDraft("");
            }}
          />
          <button className="button small secondary" onClick={() => {
            const value = likeDraft.trim();
            if (value && !card.likes.includes(value)) patch({ likes: [...card.likes, value] });
            setLikeDraft("");
          }}><Plus size={15} /></button>
        </div>
      </div>

      <div className="editor-wide">
        <span className="editor-label">小朋友喺 MEE 小鎮玩邊個角色</span>
        <div className="hero-picker">
          {HEROES.map(hero => (
            <button
              key={hero.id}
              className={(card.heroId ?? HEROES[0].id) === hero.id ? "hero-option selected" : "hero-option"}
              onClick={() => patch({ heroId: hero.id })}
              aria-pressed={(card.heroId ?? HEROES[0].id) === hero.id}
            >
              <img src={hero.art} alt="" />
              <span>{hero.nameZh}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="editor-wide">
        <span className="editor-label">背景場景</span>
        <div className="scene-picker">
          {SCENES.map(([src, label]) => (
            <button
              key={src}
              className={card.scene === src ? "scene-option selected" : "scene-option"}
              onClick={() => patch({ scene: src })}
              aria-pressed={card.scene === src}
            >
              <img src={src} alt="" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>

    <section className="lost-mode-editor">
      <div className="kid-lost-head"><MapPin /><h2>遺失模式</h2></div>
      <p className="kid-section-note">
        開咗之後，執到小朋友物品嘅人可以經 QR 貼紙聯絡你。
        <strong>你嘅電郵同電話唔會公開</strong>，訊息由 MINIMEE 轉交。
      </p>

      <label className="toggle-row">
        <input type="checkbox" checked={card.lostModeEnabled}
          onChange={event => patch({
            lostModeEnabled: event.target.checked,
            lostModeToken: event.target.checked ? (card.lostModeToken ?? mintLostToken()) : card.lostModeToken,
          })} />
        <span>開啟遺失模式</span>
      </label>

      {card.lostModeEnabled && <label>
        <span>俾執到嘅人睇嘅訊息</span>
        <textarea value={card.lostModeMessage} maxLength={300} rows={3}
          placeholder="例如：如果你揀到呢件嘢，唔該聯絡我媽咪，多謝你！"
          onChange={event => patch({ lostModeMessage: event.target.value })} />
      </label>}

      <p className="kid-section-note">
        <ShieldCheck size={13} />
        一關掣，之前派出去嘅連結即刻失效，唔使等。
      </p>
    </section>

    <div className="editor-actions">
      <button className="button" onClick={() => void handleSave()} disabled={busy}>
        <Save size={16} />{busy ? "儲存中…" : "儲存"}
      </button>
      {saved && <span className="editor-saved" role="status"><Check size={15} />已儲存</span>}
    </div>
  </Shell>;
}

// Picks a word by its picture. A child filling in their own card should be
// choosing from things they can see, not typing — and because a sticker's
// filename is the word it stands for, tapping one writes the right text with
// no separate mapping for anyone to maintain.
//
// Renders nothing at all when that pack is empty, so the editor stays tidy
// until Em has uploaded the artwork.
function StickerPicker({ category, chosen, onPick }: {
  category: StickerCategory;
  chosen: string[];
  onPick: (label: string) => void;
}) {
  const stickers = stickersIn(category);
  if (stickers.length === 0) return null;
  return <div className="sticker-picker" role="group" aria-label={`${CATEGORY_LABELS[category]}貼紙`}>
    {stickers.map(sticker => (
      <button
        key={sticker.src}
        className={chosen.includes(sticker.label) ? "sticker-option selected" : "sticker-option"}
        onClick={() => onPick(sticker.label)}
        aria-pressed={chosen.includes(sticker.label)}
      >
        <img src={sticker.src} alt="" />
        <span>{sticker.label}</span>
      </button>
    ))}
  </div>;
}
