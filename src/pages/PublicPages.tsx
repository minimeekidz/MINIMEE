import { CalendarDays, Check, Crown, Heart, Play, ShieldCheck, Sparkles, Star, Zap } from "lucide-react";
import { FormEvent, ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { DemoBadge, IntegrationNotice, PublicHeader, StatusPill } from "../components/UI";
import { PLANS, type PlanType } from "../lib/plans";
import { faqSchema, serviceSchema, useStructuredData } from "../lib/seo";
import { EXAMPLE_CARDS } from "../lib/kidCard";

export function HomePage() {
  return (
    <div className="public-page">
      <PublicHeader />
      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <DemoBadge label="MINIMEE · 小朋友版電子名片" />
            <h1>小朋友嘅<br /><em>自我介紹卡。</em></h1>
            <p>大人有商業電子名片，小朋友都應該有一張。一條連結，講齊佢係邊個、鍾意咩、儲咗咩，仲可以開遺失模式。</p>
            <div className="hero-actions">
              <Link className="button" to="/kid/mimi">睇一張示範卡</Link>
              <Link className="text-link" to="/play"><Play size={17} />試玩儲卡小遊戲</Link>
            </div>
            <div className="trust-row">
              <span><ShieldCheck />家長批核先公開</span><span><Heart />自我介紹片</span><span><Sparkles />做任務儲 MEE 卡</span>
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
          <div className="section-heading"><StatusPill>四步完成</StatusPill><h2>由行入 MEE 小鎮，到一張屬於佢嘅卡</h2></div>
          <div className="steps-grid">
            {[
              ["01", "行入 MEE 小鎮", "揀個角色，喺小鎮、碼頭、嘉年華同蘑菇村自由行"],
              ["02", "入房學新詞語", "每間房有段片同一個詞語遊戲，玩完就攞到一塊碎片"],
              ["03", "同小寵物做朋友", "傾計、分享今日學咗嘅字，好感度愈高解鎖愈多互動"],
              ["04", "儲夠碎片換 MEE 卡", "四塊碎片換一張卡，家長批核先公開自我介紹卡"]
            ].map(([n, title, copy]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
        </section>

        <section className="steps-section">
          <div className="section-heading"><StatusPill tone="gold">示範</StatusPill><h2>睇下真實嘅卡係點</h2></div>
          <div className="example-grid">
            {EXAMPLE_CARDS.map(card => (
              <Link className="example-card" key={card.slug} to={`/kid/${card.slug}`}>
                <img src={card.scene} alt="" />
                <div className="example-card-body">
                  <img className="example-avatar" src={card.avatar} alt="" />
                  <strong>{card.nickname}</strong>
                  <small>{card.tagline}</small>
                  <span className="example-meta">{card.cards.length} 張 MEE 卡 · 想做{card.dreamJob}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <footer><span>© 2026 MINIMEE</span><div><Link to="/privacy">私隱</Link><Link to="/terms">條款</Link><Link to="/faq">FAQ</Link></div></footer>
    </div>
  );
}

export function HowItWorksPage() {
  const services = [
    ["/assets/parent-child-space.webp", "家長建立孩子檔案", "一個家長帳戶最多管理3名孩子；孩子沒有獨立登入，每名孩子的訂閱、進度和媒體互相分開。"],
    ["/assets/hero-studio-interior.webp", "完成小任務", "家長選擇主題後，孩子透過詞彙、問題和小遊戲逐步完成學習任務。"],
    ["/assets/mee-cinema.webp", "製作個人化影片", "使用家長授權的相片和選項製作學習影片及孩子AI影片，完成品質檢查後才派發。"],
    ["/assets/album-house-interior.webp", "收藏童年成果", "把完成的主題、影片和MEE收藏卡放進孩子的私人紀念空間，由家長控制下載和分享。"]
  ];
  return (
    <div className="public-page"><PublicHeader /><main className="content-page">
      <DemoBadge label="MINIMEE服務流程" /><h1>把學習、個人化影片和童年收藏放在一起</h1>
      <p className="lead">MINIMEE是由家長管理的兒童個人化學習及紀念服務。孩子完成主題任務後，可獲得個人化影片和MEE收藏卡。</p>
      <div className="service-story-grid">{services.map(([image, title, copy], index) =>
        <article key={title}>
          <img src={image} alt="" />
          <div><span>0{index + 1}</span><h2>{title}</h2><p>{copy}</p></div>
        </article>
      )}</div>
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
  // Plan copy and pricing live in src/lib/plans.ts so this page and the
  // parent checkout can never drift apart (ops doc section 12).
  const icons: Record<PlanType, ReactNode> = {
    one_time_theme: <Zap />,
    monthly_3m: <CalendarDays />,
    yearly: <Crown />,
  };
  const plans = PLANS;
  useStructuredData("minimee-service", serviceSchema(PLANS));
  return (
    <div className="public-page"><PublicHeader /><main className="content-page">
      <DemoBadge label="MINIMEE正式方案" /><h1>為每位小朋友獨立選方案</h1>
      <p className="lead">每個家長帳戶最多管理三名小朋友；每名小朋友都需要獨立訂閱。</p>
      <section className="pricing-showcase">
        <div className="pricing-grid">{plans.map(plan =>
          <article className={plan.highlight ? "featured" : ""} key={plan.planType}>
            <img className="plan-art" src={plan.cardArt} alt="" />
            <div className="plan-body">
              {plan.highlight && <StatusPill tone="gold">最多家庭選擇</StatusPill>}
              <div className="plan-heading"><span>{plan.emoji}</span>{icons[plan.planType]}<h2>{plan.title}</h2></div>
              <p>{plan.subtitle}</p><div className="price-placeholder">{plan.price}</div><small>{plan.priceNote}</small>
              <ul>{plan.perks.map(perk => <li key={perk}><Check />{perk}</li>)}</ul>
              <Link className="button" to="/login">家長登入後選方案</Link>
            </div>
          </article>
        )}</div>
        <p className="pricing-note">預繳方案的「隨時取消」是停止下一期續訂；已付款服務期及退款安排受退款與重做政策約束。所有金額均為港幣。</p>
      </section>
    </main></div>
  );
}

const FAQS = [
  ["小朋友會有自己的公開登入嗎？", "不會。孩子必須在家長登入的 session 內切換 child context。"],
  ["一個家長可以管理多少名小朋友？", "最多三名；每名小朋友擁有獨立檔案、學習進度及訂閱。"],
  ["取消後會即時刪除成果嗎？", "不會。已付服務期完結後進入 180 日唯讀期，期間仍可查看及下載。"],
  ["每張卡可以重抽嗎？", "不可。卡號與 NORMAL／FLASH 在主題權益派發時鎖定。"],
  ["朋友可以直接看影片嗎？", "不可。每段影片都要由卡主家長獨立批准分享。"]
] as const;

export function FaqPage() {
  const faqs = FAQS;
  useStructuredData("minimee-faq", faqSchema(FAQS));
  return <div className="public-page"><PublicHeader /><main className="content-page">
    <DemoBadge label="MINIMEE 家長支援" /><h1>家長常見問題</h1>
    <p className="lead">關於帳戶、訂閱和收藏卡的常見疑問；未解答到的問題歡迎電郵 minimee.kidz@gmail.com。</p>
    <div className="faq-list">{faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
  </main></div>;
}

export function AuthPage() {
  const { pathname } = useLocation();
  const mode = pathname.includes("register") ? "register" : pathname.includes("forgot") ? "forgot" : "login";
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const title = mode === "register" ? "建立家長帳戶" : mode === "forgot" ? "重設密碼" : "歡迎家長回來";
  const detail = mode === "register" ? "只有家長擁有登入帳戶；孩子不會建立獨立登入。" : mode === "forgot" ? "輸入家長電郵，正式連接後會寄出短效重設連結。" : "登入後管理孩子的主題、影片、收藏及分享權限。";
  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
  }
  return (
    <div className="auth-page">
      <Link className="brand" to="/"><span className="brand-mark">M</span><span>MINIMEE</span></Link>
      <form className="auth-card" onSubmit={submit}>
        <DemoBadge label="AUTH FRONTEND READY" />
        <h1>{title}</h1><p>{detail}</p>
        {!submitted ? <>
          <label>電郵地址<input aria-label="家長電郵地址" type="email" required placeholder="parent@example.com" /></label>
          {mode !== "forgot" && <label>密碼<div className="password-field"><input aria-label="家長密碼" type={showPassword ? "text" : "password"} minLength={8} required placeholder="最少8個字元" /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? "隱藏" : "顯示"}</button></div></label>}
          {mode === "register" && <label className="check-label"><input type="checkbox" required />我確認這是家長帳戶，並同意在上載兒童資料前閱讀私隱條款</label>}
          <button className="button" type="submit">{mode === "register" ? "建立示範帳戶" : mode === "forgot" ? "發送示範重設要求" : "示範登入"}</button>
        </> : <div className="auth-success" role="status"><Check /><div><strong>{mode === "forgot" ? "重設要求已準備" : mode === "register" ? "請驗證家長電郵" : "示範登入完成"}</strong><p>{mode === "forgot" ? "正式連接後，重設連結會設有效期並只能使用一次。" : "Supabase連接後才會建立真實Session。"}</p></div></div>}
        <div className="auth-links">{mode !== "login" && <Link to="/login">返回登入</Link>}{mode === "login" && <><Link to="/forgot-password">忘記密碼</Link><Link to="/register">建立家長帳戶</Link></>}</div>
        <Link to="/parent/dashboard" className="demo-entry">進入安全家長帳戶</Link>
      </form>
    </div>
  );
}

const legalDocuments: Record<string, { intro: string; sections: [string, string[]][] }> = {
  "私隱政策": {
    intro: "本政策說明MINIMEE如何收集、使用、保護、分享及刪除家長與兒童的個人資料。MINIMEE由家長建立和管理帳戶；孩子不設獨立登入。",
    sections: [
      ["1. 我們收集的資料", ["家長帳戶資料：姓名或稱呼、電郵、登入及安全紀錄、付款狀態和客服紀錄。", "兒童檔案資料：暱稱、年齡組別、興趣、語言選項、學習進度及家長設定。", "製作素材：由家長選擇上載的兒童相片、聲音選項，以及由服務產生的影片、遊戲成果和MEE收藏卡。", "好友及失物資料：好友顯示名稱、Icon、家長授權狀態、逐段影片分享權限、失物QR Token及匿名訊息。", "技術資料：裝置、瀏覽器、IP位址、安全事件及必要Cookie。MINIMEE不會要求兒童自行提供真實姓名、電話、地址或登入資料。"]],
      ["2. 收集目的與家長授權", ["我們只會為建立帳戶、提供學習與影片服務、處理付款、品質檢查、客服、安全、防止濫用及履行法律責任而使用資料。", "家長必須有權代表孩子提供資料及批准相關用途。上載前，家長應按孩子的年齡和理解能力向孩子解釋，並尊重孩子不願拍攝或分享的意願。", "如要把資料用於並非原本直接相關的新目的，我們會先取得適用的明確同意。MINIMEE不會出售兒童個人資料，亦不會把兒童相片用於公開廣告或訓練通用AI模型，除非另行取得清楚、可撤回的家長授權。"]],
      ["3. AI製作及供應商", ["個人化影片可能由受委託的雲端、儲存、電郵、付款及AI製作供應商處理。供應商只可按MINIMEE指示、在完成指定服務所需範圍內處理資料。", "我們會盡量減少傳送資料、使用私人儲存及短效連結，並限制員工和供應商權限。AI輸出可能出現錯誤，因此影片派發前會按流程作自動或人工品質檢查。"]],
      ["4. 分享與好友", ["掃描好友QR只建立連接或重新授權請求；每段影片仍需由影片所屬孩子的家長獨立批准。", "家長刪除好友後，所有影片觀看權立即撤銷。朋友顯示名稱和Icon可留在中斷連接歷史，但不出現在朋友相簿、不佔名額；重新觀看必須重新掃描並由對方家長重新授權。", "失物訊息會同時建立站內通知及匿名電郵轉寄。拾獲者與物主不會看到對方私人電郵、電話或地址。"]],
      ["5. 保存、取消與刪除", ["資料只會保存至完成上述用途所需期限。帳戶有效期間，家長可查看其孩子的成果；「永久保留」指帳戶存在且資料未按本政策刪除期間可保留及下載，不代表不可撤回或無限期伺服器保存。", "訂閱取消後，服務維持至已付款期結束，之後進入180日唯讀期。期間可查看及下載但不可建立新內容；我們可在第0、90、150及173日發出提醒。", "唯讀期結束後，我們會撤銷分享並刪除或不可逆匿名化兒童媒體及非必要資料。付款、稅務、防詐騙、同意及爭議紀錄可在法律、審計或申索所需期限內另行保存。", "家長可提早要求刪除帳戶。完成身份核實及處理必要保留項目後，我們會刪除適用資料；已由家長下載或另行分享的副本不受我們控制。"]],
      ["6. 保安與跨境處理", ["我們計劃採用最小權限、Row Level Security、私人儲存、傳輸加密、短效簽署連結、操作審計及事件處理措施。任何網絡服務均不能保證絕對安全。", "供應商可能在香港以外處理資料。我們會評估其資料保護措施，並以合約及技術限制資料用途。"]],
      ["7. 家長權利與聯絡", ["家長可要求查閱、更正、下載或刪除其本人及孩子的個人資料，亦可撤回非必要同意。部分要求可能需要核實身份，並受法律允許的例外及合理處理安排限制。", "MINIMEE由COZY KIDZ WORLD營運。私隱及資料要求請電郵至minimee.kidz@gmail.com。本政策生效日期：2026年7月28日。"]]
    ]
  },
  "服務條款": {
    intro: "使用MINIMEE即表示家長同意本條款。MINIMEE是家長管理的兒童個人化學習、AI影片及童年收藏服務，不取代學校課程、教師、醫療或專業意見。",
    sections: [
      ["1. 帳戶資格與家長責任", ["只有年滿18歲並有權代表孩子作決定的家長或合法監護人可以建立帳戶、付款及授權。孩子沒有獨立登入。", "一個家長帳戶最多管理3名孩子；每名孩子均有獨立檔案、進度、媒體權限及訂閱。家長須保護登入資料、家長PIN及QR連結，並確保提交資料準確合法。"]],
      ["2. 方案及派發", ["單次主題HK$128，包括1個主題、1段學習影片、1段孩子AI影片、學習小遊戲及普通版MEE收藏卡PDF。", "3個月預繳HK$324，每月派發2個主題，另包括小寵物養成、10位朋友紀念冊名額、普通版MEE收藏卡PDF、遺失模式及HK$46一章的加購資格。", "全年預繳HK$1,188，每月派發2個主題，另包括小寵物養成、不設名額上限的朋友紀念冊、炫彩版MEE收藏卡PDF、遺失模式、多語言配音及HK$46一章的加購資格。", "所有方案屬每名孩子獨立購買。顯示的每月平均價只供比較，實際在購買時按整個預繳期收費。"]],
      ["3. 續訂、取消及使用權益", ["如結帳頁標明自動續訂，系統會在下一期開始時收費。家長可在下一次收費前取消續訂；取消不會自動退回已付款服務期。", "主題權益在家長選擇並提交製作時可標記為已預留；影片完成及通過品質檢查後標記為已消耗。不得以重複帳戶、未授權素材或技術方式重複領取權益。", "朋友名額指同一時間已連接並可出現在朋友相簿的關係數。已中斷連接的歷史名稱和Icon不佔名額。『不設名額上限』仍受合理使用、技術、安全及防濫用限制。"]],
      ["4. 相片、聲音及內容授權", ["家長保留其上載素材的權利，並授予MINIMEE及必要供應商一項有限、非獨家、可撤回的權限，只為提供、保護及支援所購服務而處理素材。", "家長不得上載未獲授權的人物、侵權、違法、仇恨、色情、危險或會傷害兒童的內容。MINIMEE可拒絕或移除不合適內容，並在合理情況下暫停相關功能。", "MINIMEE保留網站設計、角色、遊戲、模板及品牌內容的權利。家長可作個人及家庭用途查看、下載和分享已交付成果，不得轉售、冒認或大量複製平台內容。"]],
      ["5. AI限制與品質處理", ["AI生成內容可能出現樣貌、動作、語音、文字或場景錯誤。MINIMEE會按產品標準檢查，但不保證每一幀完全無誤或與真人完全一致。", "製作失敗時，我們會以禮貌訊息通知家長、保留相關主題權益並建立人工處理個案。家長毋須重複提交或付款；處理方法可包括重試、要求補充合適素材、重做或按退款政策提供補救。"]],
      ["6. 可用性、停權與責任", ["維修、供應商中斷、不可抗力或安全事故可能令服務暫停。我們會在合理可行情況下恢復服務及通知受影響家長。", "在適用法律允許的最大範圍內，MINIMEE不對間接、附帶或後果性損失負責；任何責任限制不會排除法律不能排除的權利或因欺詐、故意不當行為等依法不得限制的責任。"]],
      ["7. 條款變更與適用法律", ["重大變更會以網站、站內訊息或電郵通知。若變更實質影響已付款服務，我們會說明生效時間及可用選項。", "本條款受香港特別行政區法律管限，爭議受香港法院非專屬司法管轄。MINIMEE由COZY KIDZ WORLD營運；客服聯絡：minimee.kidz@gmail.com。生效日期：2026年7月28日。"]]
    ]
  },
  "退款與重做政策": {
    intro: "本政策適用於MINIMEE的單次主題、預繳訂閱及加購章節。它不限制適用法律下不能被排除的消費者權利。",
    sections: [
      ["1. 取消續訂", ["家長可隨時停止下一期自動續訂。3個月及全年方案屬預繳方案，取消後不再於下一期收費，現有服務維持至已付款期結束。", "『隨時取消』不代表已付款的3個月或全年費用自動按月退回。"]],
      ["2. 尚未開始製作", ["如付款重複、金額錯誤，或相關主題尚未選擇、權益尚未預留且製作尚未開始，家長可聯絡客服要求取消及退款。", "退款會退回原付款方式；實際到帳時間取決於付款服務商及發卡銀行。"]],
      ["3. 個人化製作開始後", ["由於服務會按孩子資料和家長選項建立個人化數碼內容，一經主題權益預留、素材提交或製作開始，一般不接受單純改變主意的退款。", "如家長提交的素材不符合規格，我們可要求重新提交；因未能提供可用或已授權素材而無法製作，不一定構成服務故障。"]],
      ["4. 製作失敗、錯誤與重做", ["如影片因系統或供應商問題失敗，我們會通知家長、保留主題權益並建立人工處理個案，不會重複扣款。", "如交付內容明顯缺件、無法播放、使用錯誤孩子素材，或存在重大人物變形、錯誤語言等與訂單明顯不符的問題，家長應在交付後14日內連同訂單／Case ID及問題說明聯絡我們。", "我們會先檢查並在合理情況下免費重做或修正。若經合理重試仍無法交付受影響項目，可退回相應主題權益、提供等值替代，或退回該未能交付項目的相應款額。"]],
      ["5. 不屬退款範圍", ["輕微風格差異、家長選錯主題或語言、已批准素材本身的品質問題、裝置或網絡問題，以及已下載後由第三方平台改動的檔案，一般不構成退款理由。", "違反服務條款、未經授權上載資料、濫用退款或欺詐所引致的停權不獲退款，但法律另有規定除外。"]],
      ["6. 申請方法", ["電郵minimee.kidz@gmail.com，提供家長帳戶電郵、孩子暱稱、訂單或Case ID、受影響項目及問題證據。請勿透過普通電郵再次附上不必要的兒童原始相片；客服會提供安全補交方式。", "我們會先確認收到申請，再核對付款、製作及品質紀錄。任何退款只會退回原付款方式；我們不會要求家長提供完整信用卡號。生效日期：2026年7月28日。"]]
    ]
  }
};

export function LegalPage({ title }: { title: string }) {
  const document = legalDocuments[title];
  if (!document) return <div className="public-page"><PublicHeader /><main className="content-page legal"><h1>{title}</h1><p>此連結需要由對方家長登入後審核及授權。</p></main></div>;
  return <div className="public-page"><PublicHeader /><main className="content-page legal">
    <DemoBadge label="版本：2026年7月28日" /><h1>{title}</h1><p className="legal-intro">{document.intro}</p>
    <aside className="legal-warning"><ShieldCheck /><p>本頁載列MINIMEE現行服務政策。MINIMEE由COZY KIDZ WORLD營運；如政策有重大更新，我們會透過網站、站內訊息或電郵通知家長。</p></aside>
    <nav className="legal-index" aria-label={`${title}目錄`}>{document.sections.map(([heading], index) => <a href={`#legal-${index}`} key={heading}>{heading}</a>)}</nav>
    <div className="legal-sections">{document.sections.map(([heading, paragraphs], index) => <section id={`legal-${index}`} key={heading}><h2>{heading}</h2>{paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}</div>
  </main></div>;
}
