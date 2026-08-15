import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { stickerFor } from "../../lib/stickers";
import type { RoomWithLesson } from "../../lib/rooms";

// Hero Studio and the two rooms behind it.
//
// 今期詞語 (the hall), 過往詞語重溫 (the library) and the cinema all read the
// same rooms/lessons the learning loop already uses. The studio does not own
// a second copy of the curriculum — it is a way into the one that exists, so
// a lesson Em publishes appears here without anybody wiring it up again.

function WordChips({ words }: { words: Array<{ word: string; meaning?: string }> }) {
  return (
    <div className="word-chips">
      {words.map(entry => {
        const art = stickerFor(entry.word);
        return (
          <div className="word-chip" key={entry.word}>
            {art
              ? <img src={art.src} alt="" />
              : <span className="word-chip-text">{entry.word}</span>}
            <strong>{entry.word}</strong>
            {entry.meaning && <small>{entry.meaning}</small>}
          </div>
        );
      })}
    </div>
  );
}

/** 今期詞語 — what is running right now, one theme at a time. */
export function CurrentWordsPanel({ rooms, childId }: { rooms: RoomWithLesson[]; childId: string }) {
  const live = rooms.filter(room => room.lesson);
  if (live.length === 0) {
    return <p className="panel-empty">今期嘅詞語仲未出。出咗會喺呢度見到。</p>;
  }
  return (
    <div className="studio-list">
      {live.map(room => (
        <section className="studio-lesson" key={room.id}>
          <header>
            <h3>{room.lesson!.title}</h3>
            <span className={room.earned ? "lesson-flag done" : "lesson-flag"}>
              {room.earned ? "碎片已取得" : "仲未儲碎片"}
            </span>
          </header>
          <p className="lesson-theme">{room.lesson!.theme}</p>
          <WordChips words={room.lesson!.words} />
          <Link className="tape-button" to={`/parent/children/${childId}/room/${room.id}`}>
            <Play size={14} />睇片同玩遊戲
          </Link>
        </section>
      ))}
    </div>
  );
}

/**
 * 過往詞語重溫 — every word the child has met, grouped by theme. Review only:
 * there is no fragment to earn twice, which is what stops the library from
 * becoming a place to farm.
 */
export function PastWordsPanel({ rooms }: { rooms: RoomWithLesson[] }) {
  const byTheme = useMemo(() => {
    const map = new Map<string, Array<{ word: string; meaning?: string }>>();
    for (const room of rooms) {
      if (!room.lesson) continue;
      const list = map.get(room.lesson.theme) ?? [];
      list.push(...room.lesson.words);
      map.set(room.lesson.theme, list);
    }
    return [...map.entries()];
  }, [rooms]);

  const [open, setOpen] = useState(0);
  if (byTheme.length === 0) {
    return <p className="panel-empty">仲未學過詞語。學完就會收喺呢度，幾時想睇返都得。</p>;
  }

  return (
    <>
      <div className="book-spines">
        {byTheme.map(([theme, words], index) => (
          <button
            key={theme}
            type="button"
            className={index === open ? "book-spine on" : "book-spine"}
            onClick={() => setOpen(index)}
          >
            <span>{theme}</span>
            <small>{words.length} 個詞</small>
          </button>
        ))}
      </div>
      <WordChips words={byTheme[Math.min(open, byTheme.length - 1)][1]} />
      <p className="panel-note">重溫唔會再攞碎片 —— 呢度淨係俾你溫返。</p>
    </>
  );
}

/**
 * 戲院大堂 — the posters are the real themes, which is the whole reason the
 * lobby exists rather than dropping the child straight into a player.
 */
export function TicketsPanel({ rooms, onPick }: {
  rooms: RoomWithLesson[];
  onPick: (roomId: string) => void;
}) {
  const showing = rooms.filter(room => room.lesson);
  if (showing.length === 0) {
    return <p className="panel-empty">今日冇場。新片出咗會貼喺大堂度。</p>;
  }
  return (
    <div className="poster-wall">
      {showing.map(room => (
        <button type="button" className="poster" key={room.id} onClick={() => onPick(room.id)}>
          <img src={room.art} alt="" />
          <span className="poster-title">{room.lesson!.title}</span>
          <small>{room.lesson!.theme}</small>
          <em className="poster-ticket">買飛入場</em>
        </button>
      ))}
    </div>
  );
}
