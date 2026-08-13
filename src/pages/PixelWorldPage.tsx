import { useState } from "react";
import { Link } from "react-router-dom";
import { PublicHeader, StatusPill } from "../components/UI";
import { PixelWorldGame, type Pickup } from "../components/PixelWorldGame";
import { EXAMPLE_CARDS } from "../lib/kidCard";

// The playable demo attached to the marketing site. A parent can try the
// world without an account — the fastest way to explain "做下任務儲 MEE 卡".
const DEMO_PICKUPS: Pickup[] = [
  { id: "p1", x: 420, label: "珊瑚花園", art: "/assets/card-01.webp" },
  { id: "p2", x: 1080, label: "小水母泡泡", art: "/assets/card-05.webp" },
  { id: "p3", x: 1760, label: "小小工程師", art: "/assets/card-09.webp" },
  { id: "p4", x: 2540, label: "海龜朋友", art: "/assets/card-11.webp" },
  { id: "p5", x: 3320, label: "夜空火箭", art: "/assets/card-09.webp" },
];

export function PixelWorldPage() {
  const [found, setFound] = useState<string[]>([]);
  const example = EXAMPLE_CARDS[0];

  return <div className="public-page"><PublicHeader />
    <main className="content-page">
      <StatusPill tone="violet">試玩 · 唔使登記</StatusPill>
      <h1>行去 MEE 小鎮搵卡</h1>
      <p className="lead">
        小朋友喺長長嘅像素小鎮左右行，行到獎勵位置就會解鎖一張 MEE 卡。
        真實版本入面，每張卡對應一個已完成嘅任務。
      </p>

      <PixelWorldGame
        pickups={DEMO_PICKUPS}
        backdrop="/assets/town-morning.webp"
        midground="/assets/harbor-market.webp"
        avatar={example.avatar}
        onCollect={id => setFound(current => current.includes(id) ? current : [...current, id])}
      />

      {found.length === DEMO_PICKUPS.length && <div className="pixel-complete" role="status">
        <h2>五張卡全部搵齊！</h2>
        <p>喺正式版度，呢啲卡會入到小朋友嘅收藏，亦會出現喺佢嘅自我介紹卡上面。</p>
        <Link className="button" to={`/kid/${example.slug}`}>睇下 {example.nickname} 嘅卡</Link>
      </div>}

      <section className="pixel-explainer">
        <h2>點解要有個遊戲？</h2>
        <p>
          小朋友唔會為咗「填資料」而興奮，但會為咗儲卡而做嘢。任務同收藏綁埋一齊，
          小朋友一路玩一路砌出自己嘅自我介紹卡 —— 而家長只需要批核。
        </p>
      </section>
    </main>
  </div>;
}
