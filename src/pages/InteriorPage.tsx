import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  decodeEntrance, interiorPath, INTERIORS,
  type InteriorFrame, type InteriorSpot,
} from "../lib/interiors";
import { InteriorPanel, InteriorScene } from "../components/InteriorScene";
import { WorldLoading } from "../components/WorldLoading";
import { useFamily } from "../contexts/FamilyContext";
import { loadEditableCard, type EditableCard } from "../lib/kidCardStore";
import { currentTrays, useCollection, usePastThemes } from "../lib/collection";
import { posterFor } from "../lib/posters";
import { FRAGMENTS_PER_CARD, useRooms } from "../lib/rooms";
import { useTownNews } from "../lib/townNews";
import { useStickerWall } from "../lib/stickerStore";
import { StickerWall } from "../components/profile/StickerWall";
import { ZONES } from "../lib/world";
import {
  AllCardsPanel, BooksPanel, SpecialsPanel, TraysPanel,
} from "../components/interior/CollectionPanels";
import { CurrentWordsPanel, PastWordsPanel } from "../components/interior/StudioPanels";
import {
  BoxOfficePanel, pastFilmsFrom, QuestionPanel, ScreeningPanel,
} from "../components/interior/CinemaFlow";
import { ageFrom } from "../lib/age";
import {
  AboutMePanel, FriendScanPanel, FriendsBookPanel, NoticeBoardPanel, UpdateCardPanel,
} from "../components/interior/HomePanels";
import {
  LooksPanel, PetNewsPanel, RoomHost, SeatPanel, SnacksPanel, SoonPanel, TreatsPanel,
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
  const wall = useStickerWall(card?.id ?? null);
  const pastThemes = usePastThemes();

  if (!interior || !childId) {
    return <main className="interior-scene"><p className="panel-empty">搵唔到呢間房。</p></main>;
  }

  // Films that are not on this month's wall. 2 號廳's whole programme, and
  // the reason 「無論是當月影片／過去的影片」 is a promise the lobby can keep.
  const pastFilms = pastFilmsFrom(pastThemes, collection.trays);
  // The film this hall is showing: a tray in 1 號廳, an older lesson in 2 號廳.
  const past = pastFilms.find(film => film.themeId === chosenTheme);
  const showing = collection.trays.find(tray => tray.themeId === chosenTheme)
    ?? (past ? {
      traySlot: 0, themeId: past.themeId, theme: past.theme, words: past.words,
      status: "carryover" as const, earned: 4, targetCode: "", bookNo: 0, slotNo: 0,
      owned: true, mode: "sentence" as const, vo: "", question: "", answerPattern: "",
      videoPath: past.videoPath ?? null,
    } : null);

  // The three stations on the 拼合室 wall: this month's themes, in their
  // configured order.
  const wallTrays = currentTrays(collection.trays);

  // Out the door you came in by. The room's own `back` is the answer for
  // anyone who arrived without one — a bookmark, a shared link, a refresh
  // after the history is gone — which is what it always was.
  const cameFrom = decodeEntrance(params.get("from")) ?? interior.back;
  const backTo = cameFrom.kind === "zone"
    ? `/parent/children/${childId}/play?zone=${cameFrom.target}&from=${interior.id}`
    : interiorPath(childId!, cameFrom.target, { kind: "room", target: interior.id });
  const backLabel = cameFrom.kind === "zone"
    ? (ZONES[cameFrom.target]?.name ?? "出去")
    : (INTERIORS[cameFrom.target]?.name ?? "出去");

  // What goes in the blank rectangles Em painted. Returning null leaves one
  // empty, which is what a month with nothing scheduled should look like —
  // an empty poster frame reads as "no film yet", a placeholder reads as a
  // bug.
  function renderFrame(frame: InteriorFrame) {
    if (frame.kind === "marquee") {
      const names = wallTrays.map(tray => tray.theme);
      if (names.length === 0) return null;
      return <span className="marquee-text">本月上映 · {names.join("・")}</span>;
    }

    if (frame.kind === "poster") {
      // Poster 1, 2, 3 in the order the releases are configured, so the wall
      // does not reshuffle itself when a child finishes one.
      const index = Number(frame.id.split("-")[1]) - 1;
      const tray = wallTrays[index];
      if (!tray) return null;
      const art = posterFor(tray.themeId);
      return (
        <button
          type="button"
          className={tray.owned ? "poster done" : "poster"}
          onClick={() => navigate(
            `/parent/children/${childId}/inside/cinema-hall?theme=${tray.themeId}`)}
        >
          {art && <img src={art} alt="" loading="lazy" />}
          <span className="poster-name">{tray.theme}</span>
          <span className="poster-mark">{tray.owned ? "✓" : `${tray.earned}/4`}</span>
        </button>
      );
    }

    if (frame.kind === "tray") {
      const tray = wallTrays[Number(frame.id.slice(5)) - 1];
      if (!tray) return null;
      return (
        <span className="tray-gems" title={tray.theme}>
          {Array.from({ length: FRAGMENTS_PER_CARD }, (_, piece) => (
            <i key={piece} className={piece < tray.earned ? "gem lit" : "gem"} aria-hidden />
          ))}
        </span>
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
    if (spot.kind === "room") {
      // The room being opened is told which room opened it, so its own way
      // out comes back here rather than to whatever its default is.
      navigate(interiorPath(childId!, spot.target, { kind: "room", target: interior!.id }));
      return;
    }
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
          {/* One mount, one theme. The room has three and each is tapped on
              its own, so opening all three at once would put the wall inside
              the wall. */}
          {open.target.startsWith("tray-") && (
            <TraysPanel
              trays={wallTrays.slice(Number(open.target.slice(5)) - 1, Number(open.target.slice(5)))}
              kidCardId={card?.id ?? null}
              onForged={() => void collection.refresh()}
              width={1}
            />
          )}
          {open.target === "specials" && <SpecialsPanel cards={collection.cards} />}
          {open.target === "stickers" && (
            wall.stickers.length > 0
              ? <StickerWall title="我儲落嘅貼紙" stickers={wall.stickers} />
              : <p className="panel-empty">
                  抽屜仲係空嘅。喺我的小屋張貼紙枱度揀，貼落自我介紹卡就會收埋喺呢度。
                </p>
          )}

          {/* Em split these: 「做當期學習主題的小遊戲、詞彙認讀學習等」. The
              board on the wall is the reading; the table in the middle is the
              game. One spot doing both meant a child sent out of the film to
              answer landed on a vocabulary list. */}
          {open.target === "current-words" && (
            <>
              <RoomHost post="studio-words" name="導師"
                line="今期呢四個字，慢慢讀一次俾我聽？" />
              <CurrentWordsPanel rooms={rooms} childId={childId} backTo={interior.id} />
            </>
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
          {open.target === "past-words" && (
            <>
              <RoomHost post="librarian" name="管理員"
                line="想搵返邊個主題？舊嘅字全部都收埋喺呢度。" />
              <PastWordsPanel rooms={rooms} />
            </>
          )}
          {open.target === "tickets" && (
            <BoxOfficePanel trays={collection.trays} past={pastFilms} childId={childId!} />
          )}
          {open.target === "screen" && (
            <ScreeningPanel
              tray={showing}
              childId={childId!}
              videoPath={showing?.videoPath ?? null}
              // 2 號廳 only ever replays, and so does a theme already forged.
              rewatch={roomId === "cinema-hall-2" || Boolean(showing?.owned)}
            />
          )}

          {open.target === "friend-scan" && <FriendScanPanel card={card} />}
          {open.target === "notice-board" && <NoticeBoardPanel news={news} />}
          {open.target === "pet-news" && <PetNewsPanel news={news} />}

          {open.target === "about-me" && <AboutMePanel card={card} />}
          {open.target === "update-card" && <UpdateCardPanel card={card} childId={childId} />}
          {open.target === "friends" && <FriendsBookPanel card={card} />}
          {open.target === "looks" && card && (
            <LooksPanel cardId={card.id} heroId={card.heroId}
              onChanged={heroId => setCard(current => (current ? { ...current, heroId } : current))} />
          )}

          {/* The small in-room moments. Driven by the spot's kind rather than
              its target, because every seat behaves the same and only the
              line differs. */}
          {open.kind === "seat" && <SeatPanel spot={open} holding={holding} />}
          {open.kind === "treat" && (
            open.target === "snacks"
              ? <SnacksPanel holding={holding} onEat={setHolding} />
              : <TreatsPanel holding={holding} onEat={setHolding}
                  host={{ post: "cafe", name: "店員", line: "今日想食啲乜？我啱啱焗好嘅。" }} />
          )}
          {open.kind === "soon" && <SoonPanel spot={open} />}
        </InteriorPanel>
      )}

      {!child && <p className="panel-note interior-note">搵唔到呢個小朋友。</p>}
    </InteriorScene>
  );
}
