import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Sparkles, Ticket } from "lucide-react";
import { ThemeGame } from "../ThemeGame";
import { signedLessonVideo } from "../../lib/rooms";
import { awardThemeFragment, type ThemeTray } from "../../lib/collection";

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

/** Ask the receptionist, pick a film. */
export function BoxOfficePanel({ trays, childId }: {
  trays: ThemeTray[]; childId: string;
}) {
  const navigate = useNavigate();
  const showing = trays.filter(tray => !tray.owned);
  const done = trays.filter(tray => tray.owned);

  return (
    <div className="box-office">
      <div className="npc-line">
        <img src="/assets/pets/usher.webp" alt="" onError={event => {
          // The usher has no portrait yet. Hiding the image rather than
          // showing a broken one keeps the bubble looking deliberate.
          (event.currentTarget as HTMLImageElement).style.display = "none";
        }} />
        <p>
          <strong>戲院職員</strong>
          {showing.length > 0
            ? "歡迎返嚟！你今日想睇邊一條學習影片呀？"
            : "今期嘅片你都睇晒喇，好叻！新片出咗我會擺喺呢度。"}
        </p>
      </div>

      {showing.length > 0 && (
        <div className="ticket-row">
          {showing.map(tray => (
            <button
              key={tray.themeId}
              type="button"
              className="ticket"
              onClick={() => navigate(
                `/parent/children/${childId}/inside/cinema-hall?theme=${tray.themeId}`)}
            >
              <Ticket size={17} />
              <strong>{tray.theme}</strong>
              <small>{tray.words.join("・")}</small>
              <em>{tray.earned} / 4 塊碎片</em>
            </button>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <p className="panel-note">
          已經砌成卡：{done.map(tray => tray.theme).join("、")}
        </p>
      )}
    </div>
  );
}

/** 戲院 1 號廳. Watch, then the exit is the question room. */
export function ScreeningPanel({ tray, childId, videoPath }: {
  tray: ThemeTray | null; childId: string; videoPath: string | null;
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
      <Link className="button" to={toQuestions}>出去答問題 →</Link>
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
