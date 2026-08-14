import { useEffect, useRef, useState } from "react";
import {
  removeStickerPhoto, signedPhoto, updateSticker, uploadStickerPhoto,
  type WallSticker,
} from "../../lib/stickerStore";

// What opens when a sticker is tapped.
//
// All four states in the spec are complete on their own: sticker alone,
// sticker plus a sentence, sticker plus a photo, or both. **Text is never
// required** — a five-year-old who cannot yet type still has a finished
// sticker, and demanding a sentence would quietly exclude them.
//
// The photo is the sensitive part:
//
//   • It lives in the private child-photos bucket. Only a path is stored, so
//     a signed URL is minted at view time and expires — switching the photo
//     off takes it away rather than leaving a URL alive (ops doc §10).
//   • It is private until a parent turns that one photo on, having read the
//     warning. Per photo, not per profile.
//   • **The warning is only ever shown while editing.** A visitor must not
//     see it; it is a decision for whoever is uploading.

const PHOTO_WARNING =
  "呢張相會俾所有睇到呢個檔案嘅人見到。如果你唔想小朋友張相俾人睇到，就唔好開呢個掣。";

export interface StickerDetailPanelProps {
  sticker: WallSticker;
  cardId: string | null;
  /** Editing shows the note field, the upload and the warning. */
  editing?: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

export function StickerDetailPanel({
  sticker, cardId, editing = false, onClose, onChanged,
}: StickerDetailPanelProps) {
  const [note, setNote] = useState(sticker.note ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPublic, setPhotoPublic] = useState(sticker.photoPublic);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const saveTimer = useRef(0);

  // A signed URL, minted per view and never stored.
  useEffect(() => {
    let live = true;
    void (async () => {
      const url = await signedPhoto(sticker.photoPath);
      if (live) setPhotoUrl(url);
    })();
    return () => { live = false; };
  }, [sticker.photoPath]);

  // The note autosaves: sticker edits belong to the child and should not need
  // a form. Debounced so typing is not one write per keystroke.
  useEffect(() => {
    if (!editing || note === (sticker.note ?? "")) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void updateSticker(sticker.id, { note }).then(() => onChanged?.());
    }, 700);
    return () => window.clearTimeout(saveTimer.current);
  }, [note, editing, sticker.id, sticker.note, onChanged]);

  async function pickPhoto(file: File | undefined) {
    if (!file || !cardId) return;
    setBusy(true);
    const path = await uploadStickerPhoto(cardId, sticker.id, file);
    setBusy(false);
    if (path) onChanged?.();
  }

  async function togglePublic(next: boolean) {
    setPhotoPublic(next);
    await updateSticker(sticker.id, { photoPublic: next });
    onChanged?.();
  }

  async function dropPhoto() {
    if (!sticker.photoPath) return;
    setBusy(true);
    await removeStickerPhoto(sticker.id, sticker.photoPath);
    setBusy(false);
    setPhotoUrl(null);
    setPhotoPublic(false);
    onChanged?.();
  }

  return (
    <aside className="paper-panel detail-panel" role="dialog" aria-label={sticker.label}>
      <button type="button" className="detail-close" onClick={onClose} aria-label="收埋">✕</button>

      <div className="detail-banner"><span>{sticker.label}</span></div>

      <div className="detail-art">
        {sticker.art
          ? <img src={sticker.art} alt="" />
          : <span className="sticker-wordmark big">{sticker.label.slice(0, 2)}</span>}
      </div>

      {editing ? (
        <label className="detail-note-field">
          <span>想講啲咩？（唔寫都得）</span>
          <textarea
            value={note}
            maxLength={120}
            rows={2}
            placeholder="例如：我最鍾意同朋友踢足球！"
            onChange={event => setNote(event.target.value)}
          />
        </label>
      ) : (
        note && <p className="detail-note">{note}</p>
      )}

      {photoUrl && (
        <figure className="detail-photo">
          {/* Object-fit contain, so a portrait photo is not cropped square. */}
          <img src={photoUrl} alt={`${sticker.label} 嘅相`} />
        </figure>
      )}

      {editing && (
        <div className="detail-upload">
          {!sticker.photoPath ? (
            <>
              <button
                type="button"
                className="upload-drop"
                onClick={() => fileInput.current?.click()}
                disabled={busy || !cardId}
              >
                <span aria-hidden>📷</span>
                {busy ? "上載緊…" : "㩒一下上載照片"}
              </button>
              <p className="upload-warning" role="note">⚠️ {PHOTO_WARNING}</p>
            </>
          ) : (
            <>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={photoPublic}
                  onChange={event => void togglePublic(event.target.checked)}
                />
                <span>俾睇到呢個檔案嘅人見到呢張相</span>
              </label>
              <p className="upload-warning" role="note">⚠️ {PHOTO_WARNING}</p>
              <button type="button" className="button small secondary" onClick={() => void dropPhoto()} disabled={busy}>
                刪除照片
              </button>
            </>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={event => void pickPhoto(event.target.files?.[0])}
          />
        </div>
      )}
    </aside>
  );
}
