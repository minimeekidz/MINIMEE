import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Sparkles, Ticket } from "lucide-react";
import { ThemeGame } from "../ThemeGame";
import { signedLessonVideo } from "../../lib/rooms";
import { awardThemeFragment, type ThemeTray } from "../../lib/collection";
import { posterFor } from "../../lib/posters";
import { npcPortrait, speak } from "../../lib/babble";
import { isDaytime } from "../../lib/world";

// 戲院 → Studio, the one loop the whole product runs on.
//
// Em's route:
//
//   戲院大堂接待處（職員 NPC）→ 揀邊條學習影片
//     → 戲院 1 號廳睇片
//       → 出口就係 Studio 答題
//         → 攞到碎片，關窗就算數
//         → 想再睇一條就由答題房捷徑返接待處
//
// The theme travels in the URL rather than in state, so a child who backs
// out, refreshes, or walks away and taps the notification lands in the same
// film rather than at the start of the queue.
//
// Fragments used to be one-per-room, which is why this used to be spread
// across nine buildings. The four fragments are now four rounds of one
// theme, which is what the games were always shaped like — one theme, four
// plays, harder each time.

/** A film that is not one of this month's themes — 2 號廳's programme. */
export interface PastFilm {
  themeId: string; theme: string; words: string[]; videoPath?: string | null;
}

/**
 * Every film the child can watch that is not on this month's wall.
 *
 * 「無論是當月影片／過去的影片，所有影片都會在這邊選擇播放」— so the split is
 * by hall, not by whether something is offered at all. Anything on this
 * month's wall plays in 1 號廳; anything else plays in 2 號廳.
 *
 * The source is the retired half of `theme_releases`, the same table
 * `rotate_themes` moves, so the rotation and the rewatch list can never
 * disagree. It used to read `room_lessons` instead, whose rows were never
 * linked to a theme — which is why 2 號廳 was always empty.
 */
export function pastFilmsFrom(
  retired: Array<{ themeId: string; theme: string; words: string[]; videoPath?: string | null }>,
  trays: ThemeTray[],
): PastFilm[] {
  const current = new Set(trays.map(tray => tray.themeId));
  const seen = new Set<string>();
  const out: PastFilm[] = [];
  for (const theme of retired) {
    if (!theme.themeId || current.has(theme.themeId) || seen.has(theme.themeId)) continue;
    seen.add(theme.themeId);
    out.push(theme);
  }
  return out;
}

/**
 * The theme's poster on its ticket.
 *
 * The lobby wall shows the same image cropped into Em's painted frames, which
 * are much narrower than a poster; this is where a child actually chooses, so
 * here it gets the whole picture.
 */
function TicketPoster({ themeId }: { themeId: string }) {
  const art = posterFor(themeId);
  if (!art) return null;
  return <img className="ticket-poster" src={art} alt="" loading="lazy" />;
}

/** Ask the receptionist, pick a film. */
export function BoxOfficePanel({ trays, past = [], childId }: {
  trays: ThemeTray[]; past?: PastFilm[]; childId: string;
}) {
  const navigate = useNavigate();
  const showing = trays.filter(tray => !tray.owned);
  const done = trays.filter(tray => tray.owned);
  const hall = (room: string, themeId: string) =>
    navigate(`/parent/children/${childId}/inside/${room}?theme=${themeId}`);

  const greeting = showing.length > 0
    ? "歡迎返嚟！你今日想睇邊一條學習影片呀？"
    : "今期嘅片你都睇晒喇，好叻！想重溫舊片就入 2 號廳。";
  // The usher babbles it. Nothing is recorded per line — the shape of the
  // sentence is what plays, so changing this text changes the sound too.
  // Cast by shift, same as the portrait — the night usher is a different
  // animal and has a voice of their own in the casting table.
  const onDuty = `usher-${isDaytime() ? "day" : "night"}`;
  useEffect(() => { void speak(onDuty, greeting); }, [onDuty, greeting]);

  return (
    <div className="box-office">
      <div className="npc-line">
        {/* Whoever is on shift. Em drew a 早更 and a 晚更 for every post, and
            the world already knows which half of the day it is — so coming
            back after dinner puts somebody else behind the desk. */}
        <img src={npcPortrait("usher", isDaytime())} alt="" onError={event => {
          // That shift has not been drawn yet. Hiding the image rather than
          // showing a broken one keeps the bubble looking deliberate.
          (event.currentTarget as HTMLImageElement).style.display = "none";
        }} />
        <p>
          <strong>戲院職員</strong>
          {greeting}
        </p>
      </div>

      {showing.length > 0 && (
        <>
          <p className="panel-note">1 號廳 · 今期上映</p>
          <div className="ticket-row">
            {showing.map(tray => (
              <button
                key={tray.themeId}
                type="button"
                className="ticket"
                onClick={() => hall("cinema-hall", tray.themeId)}
              >
                <Ticket size={17} />
                <TicketPoster themeId={tray.themeId} />
                <strong>{tray.theme}</strong>
                <small>{tray.words.join("・")}</small>
                <em>{tray.earned} / 4 塊碎片</em>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Finished themes stay in 1 號廳 — they are still this month's films,
          and a child who wants one again should not have to pretend they
          have not finished it. Watching does not pay a second time. */}
      {done.length > 0 && (
        <>
          <p className="panel-note">1 號廳 · 已經完成（睇返都得，唔會再有碎片）</p>
          <div className="ticket-row">
            {done.map(tray => (
              <button
                key={tray.themeId}
                type="button"
                className="ticket done"
                onClick={() => hall("cinema-hall", tray.themeId)}
              >
                <TicketPoster themeId={tray.themeId} />
                <strong>{tray.theme}</strong>
                <small>{tray.words.join("・")}</small>
                <em>已砌成卡 ✓</em>
              </button>
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <p className="panel-note">2 號廳 · 過往主題</p>
          <div className="ticket-row">
            {past.map(film => (
              <button
                key={film.themeId}
                type="button"
                className="ticket past"
                onClick={() => hall("cinema-hall-2", film.themeId)}
              >
                <TicketPoster themeId={film.themeId} />
                <strong>{film.theme}</strong>
                <small>{film.words.join("・")}</small>
                <em>重溫</em>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * A hall. Watch, and — in 1 號廳, on a theme still worth fragments — the exit
 * is the question room.
 *
 * `rewatch` is what keeps 2 號廳 honest. A finished or older film offers a way
 * back to the lobby instead of a way to the questions, because the questions
 * would hand out nothing and a button that does nothing is worse than no
 * button.
 */
export function ScreeningPanel({ tray, childId, videoPath, rewatch = false }: {
  tray: ThemeTray | null;
  childId: string;
  videoPath: string | null;
  rewatch?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing || !videoPath) return;
    // Minted at play time and expiring, so ending a subscription actually
    // takes the film away rather than leaving a working link in the wild.
    void signedLessonVideo(videoPath).then(setUrl);
  }, [playing, videoPath]);

  if (!tray) {
    return <p className="panel-empty">
      入場前要先去接待處買飛，揀定睇邊一條片。
    </p>;
  }

  const backToLobby = `/parent/children/${childId}/inside/cinema-lobby`;

  const toQuestions =
    `/parent/children/${childId}/inside/studio?theme=${tray.themeId}&ask=1`;

  return (
    <div className="screening">
      <h3>{tray.theme}</h3>
      <p className="panel-note">{tray.words.join("・")}</p>

      {playing && url
        ? <video src={url} controls autoPlay playsInline />
        : <button className="room-video-poster" onClick={() => setPlaying(true)}>
            <img src="/assets/world/cinema-hall.webp" alt="" />
            <span className="kid-play"><Play size={26} /></span>
            <span className="kid-video-label">▶ 播放</span>
          </button>}

      {playing && !url && (
        <p className="kid-note">呢條片仲未上載 —— 可以直接出去答問題。</p>
      )}

      {/* The exit is the question room. That is the whole route: a film is
          not finished until the child has done something with it. */}
      {rewatch
        ? <>
            <p className="kid-note">呢條片你已經完成咗，重溫唔會再有碎片。</p>
            <Link className="button" to={backToLobby}>返大堂揀第二套 →</Link>
          </>
        : <Link className="button" to={toQuestions}>出去答問題 →</Link>}
    </div>
  );
}

/** Studio, in question mode. */
export function QuestionPanel({ tray, childId, kidCardId, level, foreignWords, onEarned }: {
  tray: ThemeTray | null;
  childId: string;
  kidCardId: string | null;
  level: number | "3-5" | "6-8" | "9-12" | "13+" | null;
  foreignWords: string[];
  onEarned: () => void;
}) {
  const [earnedNow, setEarnedNow] = useState(false);
  const source = useMemo(() => tray && ({
    themeId: tray.themeId, nameZh: tray.theme, words: tray.words,
    vo: tray.vo, question: tray.question,
    answerPattern: tray.answerPattern, mode: tray.mode,
  }), [tray]);

  if (!tray || !source) {
    return <p className="panel-empty">
      揀咗條片先。去戲院大堂接待處同職員講聲就得。
    </p>;
  }

  if (earnedNow) {
    // Em: 「獲得卡之後可能交叉個視窗就已經 OK，如果想知道嘅話可以提示佢哋去
    // 碎片展示室」. So this celebrates and then gets out of the way — the
    // progress bar lives in the 拼合室, not here.
    return (
      <div className="earned-note" role="status">
        <Sparkles />
        <h3>攞到一塊碎片！</h3>
        <p>{tray.theme} · {tray.earned + 1} / 4</p>
        <div className="earned-actions">
          <Link className="button" to={`/parent/children/${childId}/inside/cinema-lobby`}>
            再睇多一條
          </Link>
          <Link className="button secondary" to={`/parent/children/${childId}/inside/fragment-room`}>
            睇下我儲咗幾多
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <ThemeGame
        source={source}
        earned={tray.earned}
        age={level}
        foreignWords={foreignWords}
        onComplete={() => {
          setEarnedNow(true);
          void (async () => {
            if (kidCardId && tray) await awardThemeFragment(kidCardId, tray.themeId);
            onEarned();
          })();
        }}
      />
      {/* 「如果想睇其他片段，可以由答題房間有捷徑返戲院大堂接待處揀下一個」 */}
      <div className="subscription-actions">
        <Link className="button secondary" to={`/parent/children/${childId}/inside/cinema-lobby`}>
          返接待處揀第二條
        </Link>
      </div>
    </>
  );
}
