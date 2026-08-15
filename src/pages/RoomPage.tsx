import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Play, Sparkles, X } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { DashboardHeader, EmptyState, Shell, StatusPill } from "../components/UI";
import { useFamily } from "../contexts/FamilyContext";
import { loadEditableCard, type EditableCard } from "../lib/kidCardStore";
import { awardFragment, signedLessonVideo, useRooms, type LessonWord } from "../lib/rooms";
import { ROOM_ART } from "../lib/world";
import { useCollection } from "../lib/collection";
import { ageFrom } from "../lib/age";
import { ThemeGame } from "../components/ThemeGame";

// One room: watch the video, then the game underneath it. Finishing the game
// earns the fragment for that room's current lesson.
//
// The game is the theme's, not the room's. A room's identity comes from its
// subject and its art; what a child does there is set by whichever theme is
// screening, because Em's rule is that a month's three themes must be three
// different games — 「如果三個主題嘅學習影片都係同一個遊戲玩法，咁就好沉悶」.
//
// A lesson with no theme still plays: it falls back to the plain pick-a-word
// game below. That keeps the pre-theme content working instead of going dark
// the day the theme catalogue arrived.
export function RoomPage() {
  const { id: childId, roomId } = useParams();
  // Which building the child walked in from. A lesson is reached through the
  // 戲院廳 or Hero Studio, so 返出去 has to put them back in that room —
  // dropping them on the town map would break 原位入口原位出口 the moment
  // the film finishes.
  const [params] = useSearchParams();
  const cameFrom = params.get("back");
  const { children, loading: familyLoading } = useFamily();
  const child = children.find(candidate => candidate.id === childId);

  const [card, setCard] = useState<EditableCard | null>(null);
  const [cardLoading, setCardLoading] = useState(true);
  const { rooms, loading: roomsLoading, refresh } = useRooms(card?.id ?? null);
  const { trays, refresh: refreshTrays } = useCollection(card?.id ?? null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!childId) return;
    void (async () => {
      setCard(await loadEditableCard(childId));
      setCardLoading(false);
    })();
  }, [childId]);

  const room = rooms.find(candidate => candidate.id === roomId);

  useEffect(() => {
    if (!playing || !room?.lesson) return;
    void (async () => {
      // The path is only readable by a subscriber, and the URL it produces
      // expires — nothing durable ever reaches the browser.
      const path = room.lesson?.videoPath;
      setVideoUrl(path ? await signedLessonVideo(path) : null);
    })();
  }, [playing, room]);

  const handleComplete = useCallback(async () => {
    if (!card || !room) return;
    await awardFragment(card.id, room.id, room.lesson?.id ?? null);
    // Both, and in this order: the room's own state decides whether the
    // fragment button is spent, the tray decides which round comes next.
    await refresh();
    await refreshTrays();
  }, [card, room, refresh, refreshTrays]);

  // Which theme is screening in this room, and therefore which game runs.
  const tray = trays.find(candidate => candidate.themeId === room?.lesson?.themeId);
  // 搵一搵's odd-one-out round needs a word that is not this theme's, and the
  // rest of the wall is the right place to borrow one: it is a word the child
  // has met, so being wrong is still worth something.
  const foreignWords = trays
    .filter(candidate => candidate.themeId !== tray?.themeId)
    .flatMap(candidate => candidate.words);
  // Difficulty comes from a real age where there is one, and from the band
  // the family picked at sign-up where there is not. Never a guessed number
  // out of a band — the band is already the answer.
  const level = child?.birth_year
    ? ageFrom(null, child.birth_year)?.years ?? null
    : child?.age_group ?? null;

  if (familyLoading || cardLoading || roomsLoading) {
    return <Shell surface="parent"><DashboardHeader title="房間" />
      <EmptyState title="載入中" detail="正在讀取房間內容。" /></Shell>;
  }

  if (!child || !card) {
    return <Shell surface="parent"><DashboardHeader title="房間" />
      <EmptyState title="要先有自我介紹卡" detail="收集到嘅碎片會記喺小朋友張卡度。" />
      {child && <div className="subscription-actions">
        <Link className="button" to={`/parent/children/${child.id}/card`}>去建立自我介紹卡</Link>
      </div>}
    </Shell>;
  }

  if (!room) {
    return <Shell surface="parent"><DashboardHeader title="房間" />
      <EmptyState title="搵唔到呢間房" detail="呢間房可能已經收起咗。" /></Shell>;
  }

  return <Shell surface="parent">
    <DashboardHeader title={room.nameZh} />

    <section className="room-header" style={{ backgroundImage: `url(${ROOM_ART[room.id] ?? room.art})` }}>
      <div className="room-header-scrim" />
      <div className="room-header-inner">
        <StatusPill tone={room.earned ? "green" : "gold"}>
          {room.earned ? "已收集碎片" : "完成有碎片"}
        </StatusPill>
        <h2>{room.lesson?.title ?? room.nameZh}</h2>
        <p>{room.blurb}</p>
      </div>
    </section>

    {!room.lesson
      ? <EmptyState title="呢間房仲未有內容" detail="新內容準備緊，可以先去其他房間睇下。" />
      : <>
          <section className="room-video">
            {playing && videoUrl
              ? <video src={videoUrl} controls autoPlay playsInline />
              : <button className="room-video-poster" onClick={() => setPlaying(true)}>
                  <img src={ROOM_ART[room.id] ?? room.art} alt="" />
                  <span className="kid-play"><Play size={26} /></span>
                  <span className="kid-video-label">▶ 睇 {room.lesson.title}</span>
                </button>}
            {playing && !videoUrl && <p className="kid-note">呢一課仲未上載影片，可以直接玩下面嘅詞語遊戲。</p>}
          </section>

          {room.earned
            ? <section className="word-game done" role="status">
                <Sparkles />
                <h3>呢間房嘅碎片已經收集咗</h3>
                <p>儲夠 4 塊碎片就換到一張 MEE 卡。</p>
              </section>
            : tray
              ? <ThemeGame
                  source={{
                    themeId: tray.themeId, nameZh: tray.theme, words: tray.words,
                    vo: tray.vo, question: tray.question,
                    answerPattern: tray.answerPattern, mode: tray.mode,
                  }}
                  earned={tray.earned}
                  age={level}
                  foreignWords={foreignWords}
                  onComplete={() => void handleComplete()}
                />
              : <WordGame
                  words={room.lesson.words}
                  alreadyEarned={false}
                  onComplete={() => void handleComplete()}
                />}
        </>}

    <div className="subscription-actions">
      {/* ?from lands the child back outside this room's own door. */}
      <Link className="button secondary" to={`/parent/children/${child.id}/play?from=${room.id}`}>返出去</Link>
    </div>
  </Shell>;
}

// The one game: hear/see a word, pick it out of four. Short on purpose —
// a child should finish a room in a couple of minutes, not grind it.
function WordGame({ words, alreadyEarned, onComplete }: {
  words: LessonWord[];
  alreadyEarned: boolean;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const target = words[index];

  // Three distractors drawn from the same lesson, so the choice is always
  // between words the child has just seen rather than random noise.
  const options = useMemo(() => {
    if (!target) return [];
    const others = words.filter(word => word.word !== target.word).slice(0, 3);
    return [...others, target].sort(() => Math.random() - 0.5);
  }, [target, words]);

  if (words.length === 0) {
    return <section className="word-game">
      <p className="kid-note">呢一課仲未加詞語。</p>
    </section>;
  }

  if (done || alreadyEarned) {
    return <section className="word-game done" role="status">
      <Sparkles />
      <h3>{alreadyEarned ? "呢間房嘅碎片已經收集咗" : "完成！攞到一塊碎片"}</h3>
      <p>儲夠 4 塊碎片就換到一張 MEE 卡。</p>
    </section>;
  }

  function choose(word: string) {
    if (word !== target.word) { setWrong(word); return; }
    setWrong(null);
    if (index + 1 >= words.length) { setDone(true); onComplete(); }
    else setIndex(index + 1);
  }

  return <section className="word-game">
    <div className="word-game-progress">第 {index + 1} / {words.length} 個詞語</div>
    <div className="word-target">
      <strong>{target.meaning || target.reading || "揀啱個詞語"}</strong>
      {target.reading && target.meaning && <small>{target.reading}</small>}
    </div>
    <div className="word-options">
      {options.map(option => (
        <button
          key={option.word}
          className={wrong === option.word ? "word-option wrong" : "word-option"}
          onClick={() => choose(option.word)}
        >
          {option.word}
          {wrong === option.word && <X size={15} />}
        </button>
      ))}
    </div>
    {wrong && <p className="kid-note">再試一次，睇真啲 🙂</p>}
    {index > 0 && <p className="kid-note"><Check size={13} />已經答啱 {index} 個</p>}
  </section>;
}
