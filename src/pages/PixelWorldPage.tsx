import { useState } from "react";
import { Link } from "react-router-dom";
import { PublicHeader, StatusPill } from "../components/UI";
import { PixelTown } from "../components/PixelTown";
import { TOWN_BUILDINGS, TOWN_PICKUPS } from "../lib/townMap";
import { EXAMPLE_CARDS } from "../lib/kidCard";

// The playable demo attached to the marketing site. A parent can try the
// world without an account — the fastest way to explain "做下任務儲 MEE 卡".
export function PixelWorldPage() {
  const [found, setFound] = useState<string[]>([]);
  const example = EXAMPLE_CARDS[0];

  return <div className="public-page"><PublicHeader />
    <main className="content-page">
      <StatusPill tone="violet">試玩 · 唔使登記</StatusPill>
      <h1>行去 MEE 小鎮搵卡</h1>
      <p className="lead">
        小朋友喺 MEE 小鎮四圍行，行埋去圖書館、戲院、收藏館同 Paw Café，
        沿路執 MEE 卡。真實版本入面，執到嘅卡會即刻儲落佢張自我介紹卡度。
      </p>

      <PixelTown
        ground="/assets/town-morning.webp"
        buildings={TOWN_BUILDINGS}
        pickups={TOWN_PICKUPS}
        onCollect={id => setFound(current => current.includes(id) ? current : [...current, id])}
      />

      {found.length === TOWN_PICKUPS.length && <div className="pixel-complete" role="status">
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
