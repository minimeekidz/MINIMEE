import { useEffect, useRef, useState } from "react";
import type { WallSticker } from "../../lib/stickerStore";

// One sticker on the page.
//
// Size is a tier, not a pixel value — XL for a favourite, M for a normal
// interest, S for a secondary one — because the spec asks for the wall to
// have hierarchy rather than a uniform grid of identical tiles.
//
// Dragging is done with pointer events rather than HTML5 drag-and-drop: the
// native API has no touch support at all, and the project has no drag
// dependency to reuse. Desktop drags immediately; touch waits for a long
// press, so a child scrolling the page does not pick a sticker up by accident.

const LONG_PRESS_MS = 320;

export interface StickerItemProps {
  sticker: WallSticker;
  /** Edit mode enables dragging and the remove button. */
  editing?: boolean;
  onOpen?: (sticker: WallSticker) => void;
  onRemove?: (sticker: WallSticker) => void;
  /** Fired when this sticker is dropped onto another one's position. */
  onDragStart?: (sticker: WallSticker) => void;
  onDragOver?: (sticker: WallSticker) => void;
  onDrop?: () => void;
  dragging?: boolean;
}

export function StickerItem({
  sticker, editing = false, onOpen, onRemove,
  onDragStart, onDragOver, onDrop, dragging = false,
}: StickerItemProps) {
  const [held, setHeld] = useState(false);
  const holdTimer = useRef(0);
  const moved = useRef(false);

  useEffect(() => () => window.clearTimeout(holdTimer.current), []);

  function pointerDown(event: React.PointerEvent) {
    if (!editing) return;
    moved.current = false;
    if (event.pointerType === "touch") {
      // Long press, so a scroll gesture is not read as a drag.
      holdTimer.current = window.setTimeout(() => {
        setHeld(true);
        onDragStart?.(sticker);
      }, LONG_PRESS_MS);
    } else {
      setHeld(true);
      onDragStart?.(sticker);
    }
  }

  function pointerUp() {
    window.clearTimeout(holdTimer.current);
    if (held) { setHeld(false); onDrop?.(); }
    else if (!moved.current) onOpen?.(sticker);
  }

  return (
    <div
      className={[
        "sticker",
        `sticker-${sticker.size}`,
        sticker.art ? "" : "sticker-wordonly",
        held || dragging ? "sticker-held" : "",
      ].filter(Boolean).join(" ")}
      onPointerDown={pointerDown}
      onPointerUp={pointerUp}
      onPointerCancel={() => { window.clearTimeout(holdTimer.current); setHeld(false); }}
      onPointerEnter={() => onDragOver?.(sticker)}
      onPointerMove={() => { moved.current = true; }}
    >
      <button
        type="button"
        className="sticker-face"
        onClick={() => { if (!editing) onOpen?.(sticker); }}
        aria-label={sticker.label}
      >
        {sticker.art
          ? <img src={sticker.art} alt="" draggable={false} />
          // The artwork pack may not carry this word yet. The wall still
          // works — the label alone is a legitimate sticker, and inventing a
          // placeholder picture would be worse than showing the word. The
          // whole word goes on the face, not a two-character crop with the
          // full word repeated underneath it.
          : <span className="sticker-wordmark">{sticker.label}</span>}
        {sticker.note && <span className="sticker-has-note" aria-hidden>✎</span>}
        {sticker.photoPath && <span className="sticker-has-photo" aria-hidden>📷</span>}
      </button>
      {sticker.art && <span className="sticker-label">{sticker.label}</span>}
      {editing && onRemove && (
        <button
          type="button"
          className="sticker-remove"
          onClick={event => { event.stopPropagation(); onRemove(sticker); }}
          aria-label={`移除 ${sticker.label}`}
        >✕</button>
      )}
    </div>
  );
}
