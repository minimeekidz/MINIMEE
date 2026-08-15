import { useCallback, useRef, useState } from "react";
import { StickerItem } from "./StickerItem";
import {
  removeSticker, reorderStickers, type WallSticker,
} from "../../lib/stickerStore";

// A titled patch of the scrapbook holding one category's stickers.
//
// Reordering saves as it happens — the spec makes sticker edits the child's
// own and free of parent approval, so a form with a Save button would be the
// wrong shape entirely. The list is reordered locally first and written
// afterwards, so dragging never waits on the network.

export interface StickerWallProps {
  title: string;
  /** A small hand-drawn mark beside the title, part of the notebook language. */
  tab?: string;
  stickers: WallSticker[];
  editing?: boolean;
  /** Shown when the wall is empty, in the child's own words. */
  emptyHint?: string;
  onOpen?: (sticker: WallSticker) => void;
  onChanged?: () => void;
  onAdd?: () => void;
}

export function StickerWall({
  title, tab, stickers, editing = false, emptyHint,
  onOpen, onChanged, onAdd,
}: StickerWallProps) {
  const [order, setOrder] = useState<WallSticker[] | null>(null);
  const dragged = useRef<WallSticker | null>(null);

  const list = order ?? stickers;

  const startDrag = useCallback((sticker: WallSticker) => {
    dragged.current = sticker;
    setOrder(stickers);
  }, [stickers]);

  const dragOver = useCallback((over: WallSticker) => {
    const moving = dragged.current;
    if (!moving || moving.id === over.id) return;
    setOrder(current => {
      const source = current ?? stickers;
      const from = source.findIndex(item => item.id === moving.id);
      const to = source.findIndex(item => item.id === over.id);
      if (from < 0 || to < 0) return source;
      const next = [...source];
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });
  }, [stickers]);

  /**
   * A tap opens the sticker; the end of a drag must not. The pointer-up that
   * finishes a drag lands on whichever sticker it was dropped onto, and that
   * sticker sees a perfectly ordinary tap — so without this the child would
   * get a detail panel for the wrong sticker every time they moved one.
   * Handlers run inner-to-outer, so the drag is still marked active here.
   */
  const openIfNotDragging = useCallback((sticker: WallSticker) => {
    if (dragged.current) return;
    onOpen?.(sticker);
  }, [onOpen]);

  const drop = useCallback(() => {
    // When a drag starts and ends on the same sticker, the pointer-up is seen
    // twice — once by the sticker, then again by the grid it bubbles to.
    // Without this guard that reorder is written to the database twice.
    if (!dragged.current) return;
    const moved = order;
    dragged.current = null;
    if (!moved) return;
    // Written after the fact so the drag itself never waits on the network.
    void reorderStickers(moved).then(() => { setOrder(null); onChanged?.(); });
  }, [order, onChanged]);

  async function remove(sticker: WallSticker) {
    await removeSticker(sticker.id);
    onChanged?.();
  }

  return (
    <section className="paper-panel sticker-wall">
      <header className="panel-head">
        <h2 className="panel-tab">{tab && <span aria-hidden>{tab}</span>}{title}</h2>
        {editing && onAdd && (
          <button type="button" className="tape-button" onClick={onAdd}>＋ 加貼紙</button>
        )}
      </header>

      {list.length === 0 ? (
        <p className="panel-empty">{emptyHint ?? "仲未揀貼紙。"}</p>
      ) : (
        <div className="sticker-grid" onPointerUp={drop} onPointerLeave={() => { if (dragged.current) drop(); }}>
          {list.map(sticker => (
            <StickerItem
              key={sticker.id}
              sticker={sticker}
              editing={editing}
              dragging={dragged.current?.id === sticker.id}
              onOpen={openIfNotDragging}
              onRemove={remove}
              onDragStart={startDrag}
              onDragOver={dragOver}
              onDrop={drop}
            />
          ))}
        </div>
      )}
    </section>
  );
}
