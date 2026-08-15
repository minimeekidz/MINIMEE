import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Sparkles, Timer, X } from "lucide-react";
import { stickerFor } from "../lib/stickers";
import {
  FAMILIES, isCorrect, roundAt, ROUNDS_PER_THEME,
  type AgeBand, type Round, type ThemeGameSource,
} from "../lib/games";

// One round of a theme's game.
//
// The child plays this four times to make one card, and the round they get is
// decided by how many fragments they already hold — so leaving half way and
// coming back tomorrow resumes rather than restarts.
//
// Two rules run through the whole component:
//
//  • A wrong answer costs nothing but another try. There is no score, no
//    lives, and no way to fail out of a round. The fragment is for finishing.
//  • The timer, where a band has one at all, only takes the star. It cannot
//    take the fragment. A clock that could delete the reward would make the
//    one thing the child came for into a threat.

export function ThemeGame({ source, earned, age, plays, foreignWords, onComplete }: {
  source: ThemeGameSource;
  /** Fragments already held for this theme — which round to play. */
  earned: number;
  /** A real age, or the band the family picked when there is no birthday. */
  age: number | AgeBand | "13+" | null;
  /**
   * How many times this theme has been finished before. Feeds the seed, so a
   * replay is the same game with a different draw rather than the same four
   * screens again.
   */
  plays?: number;
  /** The other trays' words — the odd-one-out round has nothing without them. */
  foreignWords?: string[];
  onComplete: () => void;
}) {
  const family = FAMILIES[source.mode];
  const foreign = useMemo(() => foreignWords ?? [], [foreignWords]);
  const round = useMemo(
    () => roundAt(source, earned, { age, salt: plays ?? 0, foreignWords: foreign }),
    [source, earned, age, plays, foreign]);

  if (!round) {
    return (
      <section className="word-game done" role="status">
        <Sparkles />
        <h3>「{source.nameZh}」四塊碎片已經儲齊</h3>
        <p>去碎片拼合室砌成一張 MEE 卡啦。</p>
      </section>
    );
  }

  return (
    <section className="theme-game">
      <header className="theme-game-head">
        <span className="theme-game-badge">{family.nameZh}</span>
        <small>{family.domain}</small>
        <span className="theme-game-progress">
          第 {round.round} / {ROUNDS_PER_THEME} 塊碎片
        </span>
      </header>
      <RoundBody key={round.round} round={round} onDone={onComplete} />
    </section>
  );
}

function RoundBody({ round, onDone }: { round: Round; onDone: () => void }) {
  const [wrong, setWrong] = useState<string | null>(null);
  const [built, setBuilt] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const [left, setLeft] = useState(round.difficulty.seconds);
  // Whether the star was still on the table when the child finished. Read at
  // the moment of finishing, not after, so a slow celebration cannot lose it.
  const beatClock = useRef(true);

  useEffect(() => {
    if (done || left === null) return;
    if (left <= 0) { beatClock.current = false; return; }
    const timer = window.setTimeout(() => setLeft(value => (value ?? 1) - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [left, done]);

  function finish() {
    setDone(true);
    onDone();
  }

  function settle(given: string, source: string) {
    if (isCorrect(round, given)) { setWrong(null); finish(); }
    else setWrong(source);
  }

  if (done) {
    return (
      <div className="theme-game-done" role="status">
        <Sparkles />
        <h3>攞到一塊碎片！{beatClock.current && left !== null ? "仲有埋星星 ⭐" : ""}</h3>
        <p>{round.round >= ROUNDS_PER_THEME
          ? "四塊齊咗，去拼合室砌卡啦。"
          : `仲差 ${ROUNDS_PER_THEME - round.round} 塊就砌到一張卡。`}</p>
      </div>
    );
  }

  const art = stickerFor(round.word);

  return (
    <div className="theme-game-body">
      <p className="theme-game-prompt">{round.prompt}</p>

      {round.difficulty.hints && art && (
        <img className="theme-game-cue" src={art.src} alt="" />
      )}
      {round.hint && <p className="theme-game-hint">💡 {round.hint}</p>}

      {left !== null && (
        <p className={left > 0 ? "theme-game-clock" : "theme-game-clock out"}>
          <Timer size={13} />
          {left > 0 ? `${left} 秒內完成有星星` : "冇咗星星，不過碎片照攞 —— 慢慢嚟"}
        </p>
      )}

      {/* Tap: pick one.
          The option is the sticker Em drew for that word where one exists —
          「小圖片連文字嘅 Sticker，可以用來選擇答案嘅時候用」. The word stays
          under it rather than only on it, so the button still reads as a
          label for a child using a screen reader, and options with no art
          (numbers, borrowed words) sit in the same row without looking
          broken. */}
      {round.input === "tap" && (
        <div className={round.options.some(option => stickerFor(option))
          ? "word-options picture" : "word-options"}>
          {round.options.map(option => {
            const face = stickerFor(option);
            return (
              <button
                key={option}
                type="button"
                className={wrong === option ? "word-option wrong" : "word-option"}
                onClick={() => settle(option, option)}
              >
                {face && <img src={face.src} alt="" />}
                <span>{option}</span>
                {wrong === option && <X size={15} />}
              </button>
            );
          })}
        </div>
      )}

      {/* Order: tap the chunks into a sentence. */}
      {round.input === "order" && (
        <>
          <p className="theme-game-built">{built.join("") || "　"}</p>
          <div className="word-options">
            {round.options.map(option => (
              <button
                key={option}
                type="button"
                className="word-option"
                disabled={built.includes(option)}
                onClick={() => {
                  const next = [...built, option];
                  // Checked against the sentence itself rather than against
                  // "every chunk placed": round four puts a chunk on screen
                  // that does not belong, so waiting for all of them would
                  // make the round unwinnable.
                  if (isCorrect(round, next.join(""))) { setBuilt(next); finish(); return; }
                  if (round.answer.startsWith(next.join(""))) { setBuilt(next); setWrong(null); }
                  else { setWrong("built"); setBuilt([]); }
                }}
              >{option}</button>
            ))}
          </div>
          {built.length > 0 && (
            <button type="button" className="button small secondary" onClick={() => setBuilt([])}>
              清返
            </button>
          )}
        </>
      )}

      {/* Type: the oldest band's last round. */}
      {round.input === "type" && (
        <form
          className="theme-game-type"
          onSubmit={event => { event.preventDefault(); settle(typed, "typed"); }}
        >
          <input
            value={typed}
            onChange={event => setTyped(event.target.value)}
            placeholder="打返成句喺度"
            aria-label="答案"
          />
          <button className="button" type="submit" disabled={!typed.trim()}>交答案</button>
        </form>
      )}

      {/* Do: physical moves. Nothing to mark — the child says when it's done. */}
      {round.input === "do" && (
        <div className="theme-game-moves">
          <ol>{round.options.map(move => <li key={move}>{move}</li>)}</ol>
          <button className="button" type="button" onClick={finish}>做完喇</button>
        </div>
      )}

      {/* Free: making something. Same contract — finishing is the answer. */}
      {round.input === "free" && (
        <div className="theme-game-make">
          <div className="word-chips">
            {round.options.map(item => {
              const piece = stickerFor(item);
              return (
                <div className="word-chip" key={item}>
                  {piece ? <img src={piece.src} alt="" /> : <span className="word-chip-text">{item}</span>}
                  <strong>{item}</strong>
                </div>
              );
            })}
          </div>
          <button className="button" type="button" onClick={finish}>砌好喇</button>
        </div>
      )}

      {wrong && <p className="kid-note">再試一次，睇真啲 🙂</p>}
      {round.round > 1 && (
        <p className="kid-note"><Check size={13} />已經儲咗 {round.round - 1} 塊碎片</p>
      )}
    </div>
  );
}
