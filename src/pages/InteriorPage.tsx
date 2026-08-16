import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { INTERIORS, type InteriorFrame, type InteriorSpot } from "../lib/interiors";
import { InteriorPanel, InteriorScene } from "../components/InteriorScene";
import { WorldLoading } from "../components/WorldLoading";
import { useFamily } from "../contexts/FamilyContext";
import { loadEditableCard, type EditableCard } from "../lib/kidCardStore";
import { useCollection } from "../lib/collection";
import { useRooms } from "../lib/rooms";
import { useTownNews } from "../lib/townNews";
import { ZONES } from "../lib/world";
import { AllCardsPanel, BooksPanel, TraysPanel } from "../components/interior/CollectionPanels";
import { CurrentWordsPanel, PastWordsPanel } from "../components/interior/StudioPanels";
import {
  BoxOfficePanel, pastFilmsFrom, QuestionPanel, ScreeningPanel,
} from "../components/interior/CinemaFlow";
import { ageFrom } from "../lib/age";
import {
  AboutMePanel, FriendScanPanel, FriendsBookPanel, NoticeBoardPanel, UpdateCardPanel,
} from "../components/interior/HomePanels";
import {
  PetNewsPanel, SeatPanel, SnacksPanel, SoonPanel, TreatsPanel,
} from "../components/interior/RoomMoments";

// One page for every building in the world.
//
// The rooms differ in what they hold, not in how they behave: art, a few
// marked things to tap, and a door back to exactly where you came from. That
// last part is Em's 原位入口原位出口 rule, and it is why `back` is part of
// each interior's definition rather than browser history — history sends a
// child who deep-linked into the 戲院 back to whatever page they were on
// before, which might be nowhere in the world at all.

export function InteriorPage() {
  const { id: childId, roomId } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // The chosen theme rides in the URL from the box office to the hall to the
  // question room, so backing out or refreshing lands in the same film rather
  // than at the start of the queue.
  const chosenTheme = params.get("theme");
  const asking = params.get("ask") === "1";
  const { children } = useFamily();
  const child = children.find(candidate => candidate.id === childId);

  const [card, setCard] = useState<EditableCard | null>(null);
  const [open, setOpen] = useState<InteriorSpot | null>(null);
  // What was ordered at the café counter. Deliberately not persisted: it is a
  // cake, not an inventory item, and a child coming back tomorrow should walk
  // into a café rather than into yesterday's half-eaten plate.
  const [holding, setHolding] = useState<string | null>(null);
  // Arriving from the box office or from the film opens the right thing by
  // itself. A child who has just chosen a film should not have to find the
  // screen, and one sent out to answer should not have to find the desk.
  useEffect(() => {
    if (!chosenTheme) return;
    const spot = INTERIORS[roomId ?? ""]?.spots.find(candidate =>
      ((roomId === "cinema-hall" || roomId === "cinema-hall-2") && candidate.target === "screen")
      || (roomId === "studio" && asking && candidate.target === "theme-game"));
    if (spot) setOpen(spot);
  }, [chosenTheme, asking, roomId]);
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    if (!childId) return;
    void (async () => setCard(await loadEditableCard(childId)))();
  }, [childId]);

  const interior = roomId ? INTERIORS[roomId] : undefined;
  const collection = useCollection(card?.id ?? null);
  const { rooms } = useRooms(card?.id ?? null);
  const { news } = useTownNews();

  if (!interior || !childId) {
    return <main className="interior-scene"><p className="panel-empty">搵唔到呢間房。</p></main>;
  }

  // Films that are not on this month's wall. 2 號廳's whole programme, and
  // the reason 「無論是當月影片／過去的影片」 is a promise the lobby can keep.
  const pastFilms = pastFilmsFrom(
    rooms.flatMap(room => room.lesson
      ? [{
          themeId: room.lesson.themeId,
          theme: room.lesson.theme,
          words: room.lesson.words.map(word => word.word),
        }]
      : []),
    collection.trays,
  );
  // The film this hall is showing: a tray in 1 號廳, an older lesson in 2 號廳.
  const past = pastFilms.find(film => film.themeId === chosenTheme);
  const showing = collection.trays.find(tray => tray.themeId === chosenTheme)
    ?? (past ? {
      traySlot: 0, themeId: past.themeId, theme: past.theme, words: past.words,
      status: "carryover" as const, earned: 4, targetCode: "", bookNo: 0, slotNo: 0,
      owned: true, mode: "sentence" as const, vo: "", question: "", answerPattern: "",
    } : null);

  const backTo = interior.back.kind === "zone"
    ? `/parent/children/${childId}/play?zone=${interior.back.target}&from=${interior.id}`
    : `/parent/children/${childId}/inside/${interior.back.target}`;
  const backLabel = interior.back.kind === "zone"
    ? (ZONES[interior.back.target]?.name ?? "出去")
    : (INTERIORS[interior.back.target]?.name ?? "出去");

  // What goes in the blank rectangles Em painted. Returning null leaves one
  // empty, which is what a month with nothing scheduled should look like —
  // an empty poster frame reads as "no film yet", a placeholder reads as a
  // bug.
  function renderFrame(frame: InteriorFrame) {
    if (frame.kind === "marquee") {
      const names = collection.trays.filter(tray => tray.status === "current")
        .map(tray => tray.theme);
      if (names.length === 0) return null;
      return <span className="marquee-text">本月上映 · {names.join("・")}</span>;
    }

    if (frame.kind === "poster") {
      // Poster 1, 2, 3 in the order the releases are configured, so the wall
      // does not reshuffle itself when a child finishes one.
      const index = Number(frame.id.split("-")[1]) - 1;
      const tray = collection.trays.filter(t => t.status === "current")[index];
      if (!tray) return null;
      return (
        <button
          type="button"
          className={tray.owned ? "poster done" : "poster"}
          onClick={() => navigate(
            `/parent/children/${childId}/inside/cinema-hall?theme=${tray.themeId}`)}
        >
          <span className="poster-name">{tray.theme}</span>
          <span className="poster-mark">{tray.owned ? "✓" : `${tray.earned}/4`}</span>
        </button>
      );
    }

    if (frame.kind === "screen") {
      if (!showing) return <span className="screen-idle">未揀片</span>;
      return <span className="screen-title">{showing.theme}</span>;
    }

    if (frame.kind === "board" && interior?.id === "studio") {
      const tray = showing ?? collection.trays.find(t => t.status === "current");
      if (!tray) return null;
      return <span className="board-words">
        {tray.theme}<em>{tray.words.join("・")}</em>
      </span>;
    }

    if (frame.kind === "board" && interior?.id === "library") {
      if (pastFilms.length === 0) return null;
      return <span className="board-words">
        重溫架<em>{pastFilms.length} 個主題</em>
      </span>;
    }

    return null;
  }

  function handleSpot(spot: InteriorSpot) {
    if (spot.kind === "room") { navigate(`/parent/children/${childId}/inside/${spot.target}`); return; }
    if (spot.kind === "route") { navigate(spot.target); return; }
    setOpen(spot);
  }

  if (!arrived) {
    return <WorldLoading src={interior.art} label={`行緊入 ${interior.name}…`} onReady={() => setArrived(true)} />;
  }

  return (
    <InteriorScene
      interior={interior}
      onSpot={handleSpot}
      onBack={() => navigate(backTo)}
      backLabel={backLabel}
      renderFrame={renderFrame}
    >
      {open && (
        <InteriorPanel title={open.label} onClose={() => setOpen(null)}>
          {open.target === "all-cards" && <AllCardsPanel cards={collection.cards} />}
          {open.target === "books" && <BooksPanel cards={collection.cards} />}
          {open.target === "trays" && (
            <TraysPanel
              trays={collection.trays}
              kidCardId={card?.id ?? null}
              onForged={() => void collection.refresh()}
            />
          )}

          {/* Em split these: 「做當期學習主題的小遊戲、詞彙認讀學習等」. The
              board on the wall is the reading; the table in the middle is the
              game. One spot doing both meant a child sent out of the film to
              answer landed on a vocabulary list. */}
          {open.target === "current-words" && (
            <CurrentWordsPanel rooms={rooms} childId={childId} backTo={interior.id} />
          )}
          {open.target === "theme-game" && (
            chosenTheme
              ? <QuestionPanel
                  tray={collection.trays.find(tray => tray.themeId === chosenTheme) ?? null}
                  childId={childId!}
                  kidCardId={card?.id ?? null}
                  level={child?.birth_year
                    ? ageFrom(null, child.birth_year)?.years ?? null
                    : child?.age_group ?? null}
                  foreignWords={collection.trays
                    .filter(tray => tray.themeId !== chosenTheme)
                    .flatMap(tray => tray.words)}
                  onEarned={() => { void collection.refresh(); }}
                />
              : <p className="panel-empty">
                  揀咗條片先。去戲院大堂接待處同職員講聲就得。
                </p>
          )}
          {open.target === "past-words" && <PastWordsPanel rooms={rooms} />}
          {open.target === "tickets" && (
            <BoxOfficePanel trays={collection.trays} past={pastFilms} childId={childId!} />
          )}
          {open.target === "screen" && (
            <ScreeningPanel
              tray={showing}
              childId={childId!}
              videoPath={rooms.find(room => room.lesson?.themeId === chosenTheme)?.lesson?.videoPath ?? null}
              // 2 號廳 only ever replays, and so does a theme already forged.
              rewatch={roomId === "cinema-hall-2" || Boolean(showing?.owned)}
            />
          )}

          {open.target === "friend-scan" && <FriendScanPanel card={card} />}
          {open.target === "notice-board" && <NoticeBoardPanel news={news} />}
          {open.target === "pet-news" && <PetNewsPanel news={news} />}

          {open.target === "about-me" && <AboutMePanel card={card} />}
          {open.target === "update-card" && <UpdateCardPanel card={card} childId={childId} />}
          {open.target === "friends" && <FriendsBookPanel />}

          {/* The small in-room moments. Driven by the spot's kind rather than
              its target, because every seat behaves the same and only the
              line differs. */}
          {open.kind === "seat" && <SeatPanel spot={open} holding={holding} />}
          {open.kind === "treat" && (
            open.target === "snacks"
              ? <SnacksPanel holding={holding} onEat={setHolding} />
              : <TreatsPanel holding={holding} onEat={setHolding} />
          )}
          {open.kind === "soon" && <SoonPanel spot={open} />}
        </InteriorPanel>
      )}

      {!child && <p className="panel-note interior-note">搵唔到呢個小朋友。</p>}
    </InteriorScene>
  );
}
