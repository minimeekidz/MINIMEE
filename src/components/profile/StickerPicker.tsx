import { useMemo, useState } from "react";
import { CATEGORY_LABELS, STICKERS, stickersIn, type StickerCategory } from "../../lib/stickers";
import type { WallCategory } from "../../lib/stickerStore";

// Choosing a sticker. Big pictures, one tap, no dropdowns and no wizard —
// a child has to be able to see what a sticker means without reading a label.
//
// The pack is read straight off the folder (src/lib/stickers.ts), so a sticker
// added to src/assets/stickers/<category>/ appears here with no code change.
// When a pack is empty the picker says so rather than pretending: an empty
// grid with no explanation reads as broken.

const TABS: Array<{ id: StickerCategory; label: string; icon: string }> = [
  { id: "activity", label: "日常", icon: "🏫" },
  { id: "interest", label: "興趣", icon: "🦕" },
  { id: "job", label: "夢想", icon: "🚀" },
  { id: "mood", label: "心情", icon: "🌈" },
];

export interface StickerPickerProps {
  /** Which wall the chosen sticker joins. */
  target: WallCategory;
  /** Labels already on that wall, so they can be shown as taken. */
  chosen: string[];
  onPick: (label: string, category: StickerCategory) => void;
  onClose: () => void;
}

export function StickerPicker({ target, chosen, onPick, onClose }: StickerPickerProps) {
  const [tab, setTab] = useState<StickerCategory>(
    target === "favourite" || target === "activity" ? "activity" : (target as StickerCategory),
  );
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const pool = search.trim() ? STICKERS : stickersIn(tab);
    const needle = search.trim();
    return needle ? pool.filter(sticker => sticker.label.includes(needle)) : pool;
  }, [tab, search]);

  return (
    <div className="picker-scrim" role="dialog" aria-label="揀貼紙" onClick={onClose}>
      <div className="picker-sheet" onClick={event => event.stopPropagation()}>
        <header className="picker-head">
          <h2>揀一張貼紙</h2>
          <button type="button" className="picker-close" onClick={onClose} aria-label="收埋">✕</button>
        </header>

        <div className="picker-tabs" role="tablist">
          {TABS.map(entry => (
            <button
              key={entry.id}
              role="tab"
              aria-selected={tab === entry.id}
              className={tab === entry.id ? "picker-tab on" : "picker-tab"}
              onClick={() => { setTab(entry.id); setSearch(""); }}
            >
              <span aria-hidden>{entry.icon}</span>{entry.label}
            </button>
          ))}
        </div>

        <input
          className="picker-search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="搵貼紙…"
          aria-label="搵貼紙"
        />

        {visible.length === 0 ? (
          <p className="panel-empty">
            {STICKERS.length === 0
              ? "貼紙圖仲未上載。放咗入 src/assets/stickers/ 之後就會自動出現喺呢度。"
              : `「${CATEGORY_LABELS[tab]}」入面搵唔到。`}
          </p>
        ) : (
          <div className="picker-grid">
            {visible.map(sticker => {
              const taken = chosen.includes(sticker.label);
              return (
                <button
                  key={sticker.src}
                  type="button"
                  className={taken ? "picker-option taken" : "picker-option"}
                  onClick={() => { if (!taken) onPick(sticker.label, sticker.category); }}
                  disabled={taken}
                >
                  <img src={sticker.src} alt="" />
                  <span>{sticker.label}</span>
                  {taken && <em aria-label="已經揀咗">✓</em>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
