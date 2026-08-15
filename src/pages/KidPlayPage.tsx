import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DashboardHeader, EmptyState, Shell } from "../components/UI";
import { GameWorld } from "../components/GameWorld";
import { useFamily } from "../contexts/FamilyContext";
import { loadEditableCard, type EditableCard } from "../lib/kidCardStore";
import { useRooms } from "../lib/rooms";
import { INTERIORS, stallRoute, WHARF_STALLS } from "../lib/interiors";
import { InteriorPanel } from "../components/InteriorScene";
import { NoticeBoardPanel } from "../components/interior/HomePanels";
import { useTownNews } from "../lib/townNews";

// MEE 世界. Children never have their own login (ops doc section 2), so this
// lives behind the parent's session: the parent opens it and hands over the
// phone.
//
// Once loaded it renders full-bleed — no Shell, no page chrome, no framed
// panel. The background is the screen, which is what makes it read as a
// place the child is standing in rather than a widget on a dashboard.
export function KidPlayPage() {
  const { id: childId } = useParams();
  const { children, loading: familyLoading } = useFamily();
  const navigate = useNavigate();
  // Set by a room's 返 link, so stepping outside puts the child back at that
  // room's door rather than at the middle of town.
  const [params] = useSearchParams();
  const returningFrom = params.get("from");
  // Coming back out of a building: the zone to open in, so the child steps
  // out where they went in rather than in the middle of town.
  const startZone = params.get("zone");
  const [board, setBoard] = useState(false);
  const { news } = useTownNews();
  const child = children.find(candidate => candidate.id === childId);

  const [card, setCard] = useState<EditableCard | null>(null);
  const [loading, setLoading] = useState(true);
  const { rooms } = useRooms(card?.id ?? null);

  const load = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    setCard(await loadEditableCard(childId));
    setLoading(false);
  }, [childId]);

  useEffect(() => { void load(); }, [load]);

  if (familyLoading || loading) {
    return <Shell surface="parent"><DashboardHeader title="MEE 世界" />
      <EmptyState title="載入中" detail="正在讀取進度。" /></Shell>;
  }

  if (!child) {
    return <Shell surface="parent"><DashboardHeader title="MEE 世界" />
      <EmptyState title="找不到這名孩子" detail="這個檔案不存在，或不屬於目前登入的家長帳戶。" /></Shell>;
  }

  if (!card) {
    return <Shell surface="parent">
      <DashboardHeader title="MEE 世界" />
      <EmptyState
        title="要先有自我介紹卡"
        detail={`${child.nickname} 學到嘅嘢同收集嘅碎片會記喺佢張卡度，所以要先建立張卡。`}
      />
      <div className="subscription-actions">
        <Link className="button" to={`/parent/children/${child.id}/card`}>去建立自我介紹卡</Link>
      </div>
    </Shell>;
  }

  return <>
    <GameWorld
      heroId={card.heroId}
      cardId={card.id}
      returningFrom={returningFrom}
      startZone={startZone}
      doneRooms={rooms.filter(room => room.earned).map(room => room.id)}
      // A door in the world leads to that building's own page; the lesson
      // rooms are reached from inside Hero Studio, not off the street.
      onEnterRoom={roomId => navigate(INTERIORS[roomId]
        ? `/parent/children/${child.id}/inside/${roomId}`
        : `/parent/children/${child.id}/room/${roomId}`)}
      onEnterStall={stallId => {
        const stall = WHARF_STALLS.find(candidate => candidate.id === stallId);
        if (stall) navigate(stallRoute(stall, child.id));
      }}
      onReadBoard={() => setBoard(true)}
      onExit={() => navigate(`/parent/children/${child.id}`)}
    />
    {board && (
      <InteriorPanel title="公告板" onClose={() => setBoard(false)}>
        <NoticeBoardPanel news={news} />
      </InteriorPanel>
    )}
  </>;
}
