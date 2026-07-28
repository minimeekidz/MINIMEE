import { Check, Heart, Play, ShieldCheck, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { DemoBadge, IntegrationNotice, PublicHeader, StatusPill } from "../components/UI";

export function HomePage() {
  return (
    <div className="public-page">
      <PublicHeader />
      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <DemoBadge label="MINIMEE · CHILDHOOD, COLLECTED" />
            <h1>每次學習，<br /><em>都收藏成童年。</em></h1>
            <p>孩子完成四個小任務，解鎖一段個人化學習影片，再把成果收藏成一張 MEE Card。</p>
            <div className="hero-actions">
              <Link className="button" to="/how-it-works">看看怎樣玩</Link>
              <Link className="text-link" to="/child"><Play size={17} />預覽 Pixel World</Link>
            </div>
            <div className="trust-row">
              <span><ShieldCheck />家長控制</span><span><Heart />童年紀念</span><span><Sparkles />個人化學習</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="world-card">
              <img src="/assets/pet-heroes.webp" alt="MINIMEE 像素寵物世界角色參考" />
              <div className="floating-card card-a"><Star />4 個詞彙</div>
              <div className="floating-card card-b">MEE CARD 09</div>
            </div>
          </div>
        </section>
        <section className="steps-section">
          <div className="section-heading"><StatusPill>一個主題 · 四步完成</StatusPill><h2>學懂、完成、留下來</h2></div>
          <div className="steps-grid">
            {[
              ["01", "家長選擇", "按年齡和興趣選今期小主題"],
              ["02", "孩子探索", "四個詞語、四道小問題、四塊碎片"],
              ["03", "完成影片", "把真實樣貌放進像素寵物世界"],
              ["04", "收藏回憶", "獲得固定卡位的 MEE Card"]
            ].map(([n, title, copy]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
        </section>
      </main>
      <footer><span>© 2026 MINIMEE</span><div><Link to="/privacy">私隱</Link><Link to="/terms">條款</Link><Link to="/faq">FAQ</Link></div></footer>
    </div>
  );
}

export function HowItWorksPage() {
  return (
    <div className="public-page"><PublicHeader /><main className="content-page">
      <DemoBadge label="THE MINIMEE LOOP" /><h1>一個小主題，變成一份可留下的成果</h1>
      <div className="journey-list">
        {["家長選定主題、語言、相片及聲音方式", "孩子完成 4 個詞彙與 4 道三選一問題", "每次完成獲得一塊不重複的 Mystery Shard", "四塊碎片解鎖個人化影片任務", "影片完成並通過 QC 後派發 MEE Card"].map((x, i) =>
          <div key={x}><span>{i + 1}</span><p>{x}</p></div>
        )}
      </div>
      <IntegrationNotice />
    </main></div>
  );
}

export function PricingPage() {
  const plans = [
    ["單次體驗", "一次主題", "10% FLASH 機率"],
    ["3 個月", "按月派發", "30% FLASH 機率"],
    ["全年收藏", "按月派發", "100% FLASH"]
  ];
  return (
    <div className="public-page"><PublicHeader /><main className="content-page">
      <DemoBadge label="價格待正式確認" /><h1>為每位小朋友獨立選方案</h1>
      <p className="lead">每個家長帳戶最多管理兩名小朋友；每名小朋友獨立訂閱。</p>
      <div className="pricing-grid">{plans.map(([name, issue, odds], i) =>
        <article className={i === 2 ? "featured" : ""} key={name}>
          {i === 2 && <StatusPill tone="gold">完整收藏</StatusPill>}<h2>{name}</h2><div className="price-placeholder">HK$ —</div>
          <p>{issue}</p><ul><li><Check />每月 2 個小主題</li><li><Check />個人化學習影片</li><li><Check />{odds}</li></ul>
          <button className="button" disabled>待 Stripe 連接</button>
        </article>
      )}</div>
    </main></div>
  );
}

export function FaqPage() {
  const faqs = [
    ["小朋友會有自己的公開登入嗎？", "不會。孩子必須在家長登入的 session 內切換 child context。"],
    ["取消後會即時刪除成果嗎？", "不會。已付服務期完結後進入 180 日唯讀期，期間仍可查看及下載。"],
    ["每張卡可以重抽嗎？", "不可。卡號與 NORMAL／FLASH 在主題權益派發時鎖定。"],
    ["朋友可以直接看影片嗎？", "不可。每段影片都要由卡主家長獨立批准分享。"]
  ];
  return <div className="public-page"><PublicHeader /><main className="content-page"><h1>家長常見問題</h1><div className="faq-list">{faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></main></div>;
}

export function AuthPage() {
  return (
    <div className="auth-page">
      <Link className="brand" to="/"><span className="brand-mark">M</span><span>MINIMEE</span></Link>
      <div className="auth-card">
        <DemoBadge label="AUTH NOT CONNECTED" />
        <h1>歡迎家長回來</h1><p>登入後管理孩子的主題、影片、收藏及分享權限。</p>
        <label>電郵地址<input type="email" placeholder="parent@example.com" /></label>
        <label>密碼<input type="password" placeholder="••••••••" /></label>
        <button className="button" disabled>待 Supabase Auth 連接</button>
        <Link to="/parent/dashboard" className="demo-entry">使用合成資料預覽家長端</Link>
      </div>
    </div>
  );
}

export function LegalPage({ title }: { title: string }) {
  return <div className="public-page"><PublicHeader /><main className="content-page legal"><DemoBadge label="DRAFT PLACEHOLDER" /><h1>{title}</h1><p>此頁為前台路由佔位，正式法律文本須在收款或上載真實兒童素材前完成審批。</p></main></div>;
}
