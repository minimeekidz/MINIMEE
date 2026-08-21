import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { npcPortrait, speak } from "../../lib/babble";
import { isDaytime } from "../../lib/world";
import type { InteriorSpot } from "../../lib/interiors";
import type { NewsItem } from "./HomePanels";

// The small things a room lets you do that are not features.
//
// Sitting down, eating a cake, looking at a wardrobe that is not built yet.
// None of them pay anything, and that is the rule rather than an oversight:
// Em ruled out a second currency 「又碎片又券，更加複雜」, so a café that
// handed out points for ordering a drink would be a shop, and a park bench
// that paid for sitting would be a chore. What they give back is a line about
// where you are, which is the whole reason a place feels like one.

/**
 * The staff member on duty, over a panel.
 *
 * Same rule as the usher: the portrait is chosen by shift, and a shift that
 * has not been drawn hides itself rather than showing a broken image. The
 * line is babbled, not read — see `babble.ts`.
 */
export function RoomHost({ post, name, line }: {
  post: string; name: string; line: string;
}) {
  // The shift is part of the identity: 早更 and 晚更 are two different
  // animals, so they are cast as two different voices. Passing the bare post
  // here would quietly drop every hand-picked voice back to the hash.
  const onDuty = `${post}-${isDaytime() ? "day" : "night"}`;
  useEffect(() => { void speak(onDuty, line); }, [onDuty, line]);
  return (
    <div className="room-host">
      <img src={npcPortrait(post, isDaytime())} alt="" onError={event => {
        (event.currentTarget as HTMLImageElement).style.display = "none";
      }} />
      <p><strong>{name}</strong>{line}</p>
    </div>
  );
}

/** 坐低. Whatever the spot says you can see from there. */
export function SeatPanel({ spot, holding }: {
  spot: InteriorSpot;
  /** What was ordered at the counter, if anything, so sitting knows about it. */
  holding?: string | null;
}) {
  return (
    <div className="room-moment">
      <p>{spot.note}</p>
      {holding && (
        <p className="room-moment-extra">
          你手上仲攞住{holding}，坐低啱啱好慢慢食。
        </p>
      )}
      <p className="panel-note">坐幾耐都得，冇人趕你。</p>
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * 甜品櫃. 「吸引的甜點及飲品（有進食的互動鍵）」.
 *
 * Everything on the list is drawn in the art, which is the point — a menu of
 * things that are not in the case would read as a different café.
 */
export const TREATS = [
  { id: "strawberry", label: "士多啤梨蛋糕", emoji: "🍰", line: "第一啖就食到成粒士多啤梨，忌廉凍凍地。" },
  { id: "cheesecake", label: "芝士蛋糕", emoji: "🧀", line: "又滑又杰，慢慢化喺口入面。" },
  { id: "cookie", label: "星星曲奇", emoji: "🍪", line: "咬落去脆卜卜，跌咗少少餅碎喺枱面。" },
  { id: "macaron", label: "馬卡龍", emoji: "🌈", line: "細細粒，一啖一個，顏色靚到唔捨得食。" },
  { id: "cocoa", label: "熱朱古力", emoji: "☕", line: "面頭浮住棉花糖，捧住杯都覺得暖。" },
  { id: "juice", label: "鮮橙汁", emoji: "🍊", line: "凍到杯身有水珠，飲一啖成個人精神返。" },
];

/** 戲院小食部. 「小食部、爆谷、飲品」 — the cinema's own case. */
export const SNACKS = [
  { id: "popcorn", label: "爆谷", emoji: "🍿", line: "一大筒，成隻手插落去都摸唔到底。仲係暖嘅。" },
  { id: "pretzel", label: "扭紋餅", emoji: "🥨", line: "咸咸脆脆，一路睇一路咬啱晒。" },
  { id: "candy", label: "彩色糖", emoji: "🍬", line: "透明樽入面五顏六色，揀邊隻都好似最好食。" },
  { id: "soda", label: "汽水", emoji: "🥤", line: "開蓋嗰下嘶一聲，泡泡衝到杯口。" },
  { id: "icecream", label: "雪糕杯", emoji: "🍨", line: "凍到手指有少少痺。要快啲食，唔係就溶。" },
];

export function SnacksPanel(props: { holding: string | null; onEat: (label: string) => void }) {
  return <TreatsPanel {...props} menu={SNACKS}
    intro="小食部亮住燈，爆谷香到成個大堂都聞到。入場前買定啲嘢？"
    free="全部免費 —— 入場都唔使錢，何況爆谷。" />;
}

export function TreatsPanel({ holding, onEat, menu = TREATS, intro, free, host }: {
  holding: string | null;
  onEat: (label: string) => void;
  /** Whoever is behind this counter, when there is somebody. */
  host?: { post: string; name: string; line: string };
  /** Which case this is. The café's cabinet by default, the cinema's counter
   *  when the lobby asks — same behaviour, different things drawn in it. */
  menu?: typeof TREATS;
  intro?: string;
  free?: string;
}) {
  const picked = menu.find(treat => treat.label === holding);

  return (
    <div className="room-moment">
      {host && <RoomHost post={host.post} name={host.name} line={host.line} />}
      {picked ? (
        <>
          <p className="treat-eaten"><span aria-hidden>{picked.emoji}</span></p>
          <p>{picked.line}</p>
          {/* Ordering again is allowed. There is nothing to spend and nothing
              to run out of, so the only reason to stop a child is a rule
              invented for its own sake. */}
          <p className="panel-note">想食第二樣就再揀過。</p>
          <div className="treat-row">
            {menu.filter(treat => treat.id !== picked.id).map(treat => (
              <button key={treat.id} type="button" className="treat"
                onClick={() => onEat(treat.label)}>
                <span aria-hidden>{treat.emoji}</span>{treat.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p>{intro ?? "櫃入面排到滿滿都係。今日想食邊樣？"}</p>
          <div className="treat-row">
            {menu.map(treat => (
              <button key={treat.id} type="button" className="treat"
                onClick={() => onEat(treat.label)}>
                <span aria-hidden>{treat.emoji}</span>{treat.label}
              </button>
            ))}
          </div>
          <p className="panel-note">{free ?? "全部免費 —— 呢度唔使錢，淨係食住玩。"}</p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * 小寵物消息板. 「可以看小寵物的最新消息／趣聞」.
 *
 * Same feed as the 公告板 in 小鎮廣場 and the same hard line through the
 * middle of it: the pet stories are made up and say so, the announcements are
 * real. Here the stories lead, because that is what Em put on this wall.
 */
export function PetNewsPanel({ news }: { news: NewsItem[] }) {
  const fun = news.filter(item => item.kind === "fun");
  const real = news.filter(item => item.kind === "announcement");

  return (
    <div className="notice-board">
      <section className="notice-section fun">
        <header>
          <h3>小寵物趣聞</h3>
          <span className="notice-flag fun">小寵物講嘅故仔 · 唔係真事</span>
        </header>
        {fun.length === 0
          ? <p className="panel-empty">今日小鎮好靜，冇乜新嘢傳。</p>
          : fun.map(item => (
            <article key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </article>
          ))}
      </section>

      {real.length > 0 && (
        <section className="notice-section real">
          <header>
            <h3>最新消息</h3>
            <span className="notice-flag real">MINIMEE 官方</span>
          </header>
          {real.map(item => (
            <article key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
              <small>{new Date(item.publishedAt).toLocaleDateString("zh-HK")}</small>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * Something drawn but not built. Em: 「更改角色造型（之後開放的新功能）」.
 *
 * It is a marker rather than nothing at all because a child will tap the
 * wardrobe either way, and a tap that does nothing reads as broken while a
 * tap that says 「之後先開放」 reads as a promise.
 */
export function SoonPanel({ spot }: { spot: InteriorSpot }) {
  return (
    <div className="room-moment soon">
      <Sparkles aria-hidden />
      <p>{spot.note}</p>
      <p className="panel-note">呢個功能仲整緊，開放咗會喺消息板講。</p>
    </div>
  );
}
