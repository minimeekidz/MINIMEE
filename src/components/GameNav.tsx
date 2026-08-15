import { Link, useLocation, useParams } from "react-router-dom";
import { Album, Home, ListChecks, Mail, Map } from "lucide-react";

// The shortcut bar.
//
// Em: 「可以加條 nav bar 喺上面、下面左邊或者右邊，方便家長或者方便啲人可以
// 快捷進入唔使一定要行到過去，但係其實佢都係一個完整嘅 Online game 咁樣處理」.
//
// So it is a shortcut, not a substitute: everything on it is somewhere the
// child could also walk to. That is the rule to keep as more is added — the
// moment something is *only* reachable from this bar, the town stops being
// the way the product works and becomes decoration with a menu bolted on.
//
// Hidden on the landing page and on the world itself: the world already fills
// the screen and a child walking around does not need a menu over the top of
// where they are going.

interface Stop { to: (childId: string) => string; label: string; icon: typeof Home }

const STOPS: Stop[] = [
  { to: id => `/parent/children/${id}/play`, label: "小鎮", icon: Map },
  { to: id => `/parent/children/${id}/inside/my-home`, label: "我的小屋", icon: Home },
  { to: id => `/parent/children/${id}/inside/album-hall`, label: "珍藏館", icon: Album },
  { to: id => `/parent/children/${id}/themes`, label: "任務", icon: ListChecks },
  { to: () => "/parent/notifications", label: "消息", icon: Mail },
];

export function GameNav({ childId }: { childId?: string }) {
  const { pathname } = useLocation();
  const params = useParams();
  const id = childId ?? params.id;

  // Without a child there is nothing to be a shortcut *to*, and a bar of dead
  // buttons is worse than no bar.
  if (!id) return null;
  // The world is full-screen and self-navigating; the landing page is the way
  // in. Neither wants a menu over it.
  if (pathname === "/" || pathname.endsWith("/play")) return null;

  return (
    <nav className="game-nav" aria-label="快捷列">
      {STOPS.map(stop => {
        const href = stop.to(id);
        const Icon = stop.icon;
        return (
          <Link
            key={stop.label}
            to={href}
            className={pathname === href ? "game-nav-stop on" : "game-nav-stop"}
            aria-current={pathname === href ? "page" : undefined}
          >
            <Icon size={19} />
            <span>{stop.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
