import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { findHero } from "../../lib/characters";
import { FESTIVAL_NAMES, useAlmanac, type LunarFestival } from "../../lib/almanac";
import { claimOccasions } from "../../lib/collection";

// 小鎮廣場嘅小舞台.
//
// Em: 「左上位置亦設計了一個可要真實企上去的舞台，之後如果有節慶／活動時都
// 可以係到有d野做下」. So two states, and the difference between them is the
// day itself rather than a schedule anybody has to remember to switch on:
//
//   平日 —— 個台係空嘅，但係你可以上去表演。冇獎，純粹好玩。
//   節慶 —— 上台做節日嗰件事，攞返嗰張節日特別回憶卡。
//
// The festival is the interesting half. `claim_occasion_cards` only hands out
// a festival card when the caller names the festival, and the only thing that
// knows today's festival is the browser (it is the side that talks to the
// 天文台). Everywhere else in the app calls it with no festival at all, which
// means the festival cards have never had a way in. This stage is that way in
// — which is a nicer answer than a background job, because the child has to
// turn up on the day and stand on the stage to get it.

/** What each festival looks like on stage, and which card it pays. */
export const STAGE_FESTIVALS: Record<LunarFestival, {
  /** The whitelisted code `claim_occasion_cards` accepts, when a card exists. */
  claim: "cny" | "midautumn" | null;
  prop: string;
  acts: string[];
  cue: string;
}> = {
  "lunar-new-year": {
    claim: "cny",
    prop: "🧧",
    acts: ["恭喜發財", "身體健康", "學業進步", "笑口常開"],
    cue: "上台講一句拜年說話，成個廣場都聽到你！",
  },
  "dragon-boat": {
    // No 端午 card in the catalogue yet, so this one is a performance and
    // says so. Offering a claim that quietly returns nothing is worse than
    // offering no claim at all.
    claim: null,
    prop: "🐲",
    acts: ["扒龍舟", "包糭", "掛香包", "叫加油"],
    cue: "上台做一樣端午節嘅嘢畀大家睇。",
  },
  "mid-autumn": {
    claim: "midautumn",
    prop: "🏮",
    acts: ["提燈籠", "唱月光光", "分月餅", "猜燈謎"],
    cue: "上台做一樣中秋節嘅嘢，做完就有份禮物。",
  },
};

/** 平日. Four things a child can do on an empty stage. */
export const EVERYDAY_ACTS = [
  { label: "唱歌", emoji: "🎤" },
  { label: "跳舞", emoji: "💃" },
  { label: "講故仔", emoji: "📖" },
  { label: "扮鬼扮馬", emoji: "🎭" },
];

export function StagePanel({ heroId, nickname, childId, kidCardId, onClaimed }: {
  heroId?: string | null;
  nickname: string;
  childId: string;
  kidCardId: string | null;
  /** Called when a festival card actually landed, so the caller can refresh. */
  onClaimed?: () => void;
}) {
  const almanac = useAlmanac();
  const hero = findHero(heroId);
  const festival = almanac.festival;
  const today = festival ? STAGE_FESTIVALS[festival] : null;

  const [act, setAct] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState(0);

  const acts = today ? today.acts : EVERYDAY_ACTS.map(one => one.label);

  async function perform(chosen: string) {
    setAct(chosen);
    // Only a festival pays anything, and only when that festival has a card.
    if (!today?.claim || !kidCardId) return;
    setBusy(true);
    const given = await claimOccasions(kidCardId, today.claim);
    setBusy(false);
    if (given > 0) { setWon(given); onClaimed?.(); }
  }

  return (
    <div className="stage-panel">
      <div className={today ? "stage-floor festive" : "stage-floor"}>
        <span className="stage-prop" aria-hidden>{today?.prop ?? "✨"}</span>
        <img className="stage-hero" src={hero.art} alt="" />
        {act && <span className="stage-bubble">{act}！</span>}
      </div>

      {today ? (
        <p className="stage-cue">
          <strong>今日係{FESTIVAL_NAMES[festival as LunarFestival]}！</strong>
          {today.cue}
        </p>
      ) : (
        <p className="stage-cue">
          今日冇活動，不過個台係空嘅 —— {nickname} 想上去做啲乜？
        </p>
      )}

      <div className="stage-acts">
        {acts.map((label, index) => (
          <button
            key={label}
            type="button"
            className={act === label ? "stage-act on" : "stage-act"}
            disabled={busy}
            onClick={() => void perform(label)}
          >
            {!today && <span aria-hidden>{EVERYDAY_ACTS[index]?.emoji}</span>}
            {label}
          </button>
        ))}
      </div>

      {act && !today && (
        <p className="stage-clap" role="status">
          👏👏👏 全場小寵物都喺度拍手！
        </p>
      )}

      {act && today && !today.claim && (
        <p className="stage-clap" role="status">
          👏👏👏 做得好！大家都望住你。
        </p>
      )}

      {won > 0 && (
        <div className="earned-note" role="status">
          <Sparkles />
          <h3>攞到一張特別回憶卡！</h3>
          <p>{FESTIVAL_NAMES[festival as LunarFestival]}限定，一年得一次。</p>
          <div className="earned-actions">
            <Link className="button" to={`/parent/children/${childId}/inside/album-hall`}>
              去珍藏館睇下
            </Link>
          </div>
        </div>
      )}

      {act && today?.claim && won === 0 && !busy && (
        <p className="stage-clap" role="status">
          👏👏👏 今年嘅節日卡你已經收咗喇，不過表演一樣咁好睇！
        </p>
      )}

      {almanac.degraded && (
        <p className="panel-note">
          （暫時連唔到天文台，所以睇唔到今日係咪節日。）
        </p>
      )}
    </div>
  );
}
