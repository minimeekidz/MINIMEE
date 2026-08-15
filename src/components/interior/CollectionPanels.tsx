import { useMemo, useState } from "react";
import { FRAGMENTS_PER_CARD } from "../../lib/rooms";
import { booksFrom, forgeCard, looseCards, TRAY_SLOTS, type CollectedCard, type ThemeTray } from "../../lib/collection";

// The three ways the 珍藏館 shows a collection.

// ---------------------------------------------------------------------------

/** 主廳: 「一禁就show所有己獲得的卡」 — no filters, no tabs, just the shelf. */
export function AllCardsPanel({ cards }: { cards: CollectedCard[] }) {
  if (cards.length === 0) {
    return <p className="panel-empty">仲未有卡。喺小鎮行下、同小寵物玩下就會執到。</p>;
  }
  const flash = cards.filter(card => card.rarity === "flash").length;
  return (
    <>
      <p className="collection-count">
        <strong>{cards.length}</strong> 張卡
        {flash > 0 && <em> · 其中 {flash} 張閃卡</em>}
      </p>
      <div className="card-shelf">
        {cards.map(card => (
          <figure className={card.rarity === "flash" ? "shelf-card flash" : "shelf-card"} key={card.id}>
            <img src={card.art} alt="" />
            <figcaption>
              <strong>{card.name}</strong>
              <small>{card.code}</small>
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

/**
 * 卡冊: 「打開主題1果冊，就會見到一冊6張入面，邊張未解鎖，邊張已獲得」.
 * The empty slots are the point — they are what tells a child there is still
 * something to find.
 */
export function BooksPanel({ cards }: { cards: CollectedCard[] }) {
  const books = useMemo(() => booksFrom(cards), [cards]);
  const loose = useMemo(() => looseCards(cards), [cards]);
  const [open, setOpen] = useState(1);

  const book = books.find(candidate => candidate.no === open) ?? books[0];
  const owned = book.slots.filter(Boolean).length;

  return (
    <>
      <div className="book-spines">
        {books.map(candidate => (
          <button
            key={candidate.no}
            type="button"
            className={candidate.no === book.no ? "book-spine on" : "book-spine"}
            onClick={() => setOpen(candidate.no)}
          >
            <span>BOOK {candidate.no} · {candidate.name}</span>
            <small>{candidate.slots.filter(Boolean).length} / {candidate.slots.length}</small>
          </button>
        ))}
      </div>

      <div className="book-spread">
        <h3>{book.name}<em>{owned} / {book.slots.length}</em></h3>
        <div className="book-grid">
          {book.slots.map((card, index) => card ? (
            <figure className={card.rarity === "flash" ? "book-slot flash" : "book-slot"} key={card.id}>
              <img src={card.art} alt="" />
              <figcaption><strong>{card.name}</strong><small>{card.code}</small></figcaption>
            </figure>
          ) : (
            <div className="book-slot empty" key={`empty-${index}`}>
              <span aria-hidden>?</span>
              <small>仲未解鎖</small>
            </div>
          ))}
        </div>
      </div>

      {loose.length > 0 && (
        <div className="book-spread">
          {/* A card a pet gave you is still yours, and hiding it because it is
              not in the printed set would be the wrong lesson entirely. */}
          <h3>其他收藏<em>{loose.length}</em></h3>
          <div className="book-grid">
            {loose.map(card => (
              <figure className={card.rarity === "flash" ? "book-slot flash" : "book-slot"} key={card.id}>
                <img src={card.art} alt="" />
                <figcaption><strong>{card.name}</strong><small>{card.code}</small></figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

/**
 * 拼合室: one tray per active theme, four pieces to a card, lit as they are
 * earned. Exactly six, always — `Math.max` here used to let a seventh theme
 * push the wall wider, which is the artwork's 3x3 grid overriding the product
 * rule rather than the other way round.
 */
export function TraysPanel({ trays, kidCardId, onForged }: {
  trays: ThemeTray[];
  kidCardId: string | null;
  onForged: () => void;
}) {
  const slots = Array.from({ length: TRAY_SLOTS }, (_, index) => trays[index] ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [won, setWon] = useState<{ name: string; art: string; rarity: string } | null>(null);

  async function forge(themeId: string) {
    if (!kidCardId) return;
    setBusy(themeId);
    const card = await forgeCard(kidCardId, themeId);
    setBusy(null);
    if (card) { setWon(card); onForged(); }
  }

  return (
    <>
      <p className="collection-count">四塊碎片砌成一張 MEE 卡。</p>
      {won && (
        <div className="forged-card">
          <img src={won.art} alt="" />
          <div>
            <strong>砌好喇！</strong>
            <p>{won.name}{won.rarity === "flash" && <em> · 閃卡！</em>}</p>
          </div>
        </div>
      )}
      <div className="tray-wall">
        {slots.map((tray, index) => (
          <div
            className={tray ? (tray.owned ? "tray done" : "tray") : "tray empty"}
            key={tray?.themeId ?? `slot-${index}`}
          >
            <strong>{tray?.theme ?? "仲未開放"}</strong>
            {tray && <em className="tray-words">{tray.words.join("・")}</em>}
            <div className="tray-pieces">
              {Array.from({ length: FRAGMENTS_PER_CARD }, (_, piece) => (
                <span
                  key={piece}
                  className={tray && piece < tray.earned ? "piece lit" : "piece"}
                  aria-hidden
                />
              ))}
            </div>
            {tray && !tray.owned && tray.earned >= FRAGMENTS_PER_CARD ? (
              <button
                type="button"
                className="tape-button"
                disabled={busy === tray.themeId}
                onClick={() => void forge(tray.themeId)}
              >{busy === tray.themeId ? "砌緊…" : "砌成一張卡"}</button>
            ) : (
              <small>
                {!tray ? "－"
                  : tray.owned ? `已砌成 · BOOK ${tray.bookNo} 第 ${tray.slotNo} 格`
                  : `${tray.earned} / ${FRAGMENTS_PER_CARD}`}
              </small>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
