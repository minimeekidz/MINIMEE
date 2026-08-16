import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { INTERIORS, type InteriorSpot } from "../lib/interiors";
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
import { BoxOfficePanel, QuestionPanel, ScreeningPanel } from "../components/interior/CinemaFlow";
import { ageFrom } from "../lib/age";
import {
  AboutMePanel, FriendScanPanel, FriendsBookPanel, NoticeBoardPanel, UpdateCardPanel,
} from "../components/interior/HomePanels";

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
  // Arriving from the box office or from the film opens the right thing by
  // itself. A child who has just chosen a film should not have to find the
  // screen, and one sent out to answer should not have to find the desk.
  useEffect(() => {
    if (!chosenTheme) return;
    const spot = INTERIORS[roomId ?? ""]?.spots.find(candidate =>
      (roomId === "cinema-hall" && candidate.target === "screen")
      || (roomId === "studio" && asking && candidate.target === "current-words"));
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

  const backTo = interior.back.kind === "zone"
    ? `/parent/children/${childId}/play?zone=${interior.back.target}&from=${interior.id}`
    : `/parent/children/${childId}/inside/${interior.back.target}`;
  const backLabel = interior.back.kind === "zone"
    ? (ZONES[interior.back.target]?.name ?? "出去")
    : (INTERIORS[interior.back.target]?.name ?? "出去");

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

          {open.target === "current-words" && (
            asking && chosenTheme
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
              : <CurrentWordsPanel rooms={rooms} childId={childId} backTo={interior.id} />
          )}
          {open.target === "past-words" && <PastWordsPanel rooms={rooms} />}
          {open.target === "tickets" && (
            <BoxOfficePanel trays={collection.trays} childId={childId!} />
          )}
          {open.target === "screen" && (
            <ScreeningPanel
              tray={collection.trays.find(tray => tray.themeId === chosenTheme) ?? null}
              childId={childId!}
              videoPath={rooms.find(room => room.lesson?.themeId === chosenTheme)?.lesson?.videoPath ?? null}
            />
          )}

          {open.target === "friend-scan" && <FriendScanPanel card={card} />}
          {open.target === "notice-board" && <NoticeBoardPanel news={news} />}

          {open.target === "about-me" && <AboutMePanel card={card} />}
          {open.target === "update-card" && <UpdateCardPanel card={card} childId={childId} />}
          {open.target === "friends" && <FriendsBookPanel />}
        </InteriorPanel>
      )}

      {!child && <p className="panel-note interior-note">搵唔到呢個小朋友。</p>}
    </InteriorScene>
  );
}
