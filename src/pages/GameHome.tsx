import { Link } from "react-router-dom";
import { MapPin, Play, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { serviceSchema, useStructuredData } from "../lib/seo";
import { PLANS } from "../lib/plans";
import { EXAMPLE_CARDS } from "../lib/kidCard";

// The front door.
//
// Em: 「一入到 Landing page 就已經係首頁主頁，然後開始遊戲之後透過城鎮去操作
// 任何嘅功能」 and 「全個網站唔會再見到有嗰啲普通網頁 page」. So this is not a
// marketing page with a link to a game — it is the game's title screen, drawn
// on the same scrapbook paper as 我的小屋, and the only real button on it is
// the one that walks in.
//
// The old page is not deleted, only unrouted: pricing and FAQ still exist as
// pages a parent can be sent to, and search engines still need something to
// read. What changes is that no child ever lands on one.

export function GameHome() {
  const { session } = useAuth();
  // The landing page is now the game's front door, so it is also the page a
  // search engine reads first — it keeps the Service schema. The FAQ schema
  // stays on /faq where the questions actually are.
  useStructuredData("minimee-service", serviceSchema(PLANS));

  // Signed in goes straight to the town; signed out gets the demo world, so
  // the first tap is always into the game and never into a form.
  const enter = session ? "/parent/dashboard" : "/play";

  return (
    <div className="game-home">
      <div className="game-home-sky" aria-hidden />

      <main className="game-home-paper">
        <header className="game-home-title">
          <span className="game-home-tape" aria-hidden />
          <h1>MINIMEE</h1>
          <p>小朋友嘅小鎮、小寵物、同佢自己嗰本收藏冊</p>
        </header>

        <Link className="game-home-start" to={enter}>
          <Play size={22} />
          <span>{session ? "返入小鎮" : "開始遊戲"}</span>
        </Link>

        <section className="game-home-strip" aria-label="小鎮入面有咩">
          {[
            { art: "/assets/world/town-centre-day.webp", name: "小鎮中心", note: "自由行走" },
            { art: "/assets/world/cinema-lobby.webp", name: "戲院", note: "睇片學新詞" },
            { art: "/assets/world/fragment-room.webp", name: "碎片拼合室", note: "砌成 MEE 卡" },
            { art: "/assets/world/cafe.webp", name: "Buddy Cafe", note: "同小寵物做朋友" },
          ].map(place => (
            <figure className="game-home-place" key={place.name}>
              <img src={place.art} alt="" loading="lazy" />
              <figcaption><strong>{place.name}</strong><small>{place.note}</small></figcaption>
            </figure>
          ))}
        </section>

        <section className="game-home-cards" aria-label="示範自我介紹卡">
          <h2><span className="game-home-tab">睇下真實嘅卡</span></h2>
          <div className="game-home-card-row">
            {EXAMPLE_CARDS.slice(0, 3).map(card => (
              <Link className="game-home-card" to={`/kid/${card.slug}`} key={card.slug}>
                <span className="game-home-card-name">{card.nickname}</span>
                <small>{card.tagline}</small>
              </Link>
            ))}
          </div>
        </section>

        <section className="game-home-notes">
          <p><ShieldCheck size={15} />家長批核先公開，每項資料自己一個掣</p>
          <p><Sparkles size={15} />儲四塊碎片砌一張 MEE 卡</p>
          <p><MapPin size={15} />行入小鎮就開始，唔使睇說明書</p>
        </section>

        {/* Kept small and at the bottom on purpose: a parent who needs the
            price can find it, and nobody else has to walk past it. */}
        <footer className="game-home-foot">
          <Link to="/pricing">方案同收費</Link>
          <Link to="/faq">常見問題</Link>
          <Link to="/login">{session ? "家長控制台" : "家長登入"}</Link>
        </footer>
      </main>
    </div>
  );
}
