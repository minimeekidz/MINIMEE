import { FormEvent, useState } from "react";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, ImagePlus, KeyRound, LockKeyhole, ShieldCheck, Sparkles, Upload, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { DemoBadge, Progress, Shell, StatusPill } from "../components/UI";
import { MAX_CHILDREN_PER_PARENT } from "../domain/rules";

const setupSteps = ["家長帳戶", "孩子檔案", "獨立訂閱", "同意與安全"];

export function ParentGatePage() {
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "verified">("idle");

  function verify(event: FormEvent) {
    event.preventDefault();
    setStatus(pin === "2468" ? "verified" : "error");
  }

  return <main className="parent-pin-page">
    <Link className="pin-back" to="/child"><ChevronLeft />返回孩子世界</Link>
    <form className="parent-pin-card" onSubmit={verify}>
      <KeyRound />
      <DemoBadge label="PARENT GATE" />
      <h1>家長驗證</h1>
      <p>孩子沒有獨立登入。進入帳戶、付款、分享或私隱設定前，需要家長PIN。</p>
      <label>4位數家長PIN
        <input aria-label="4位數家長PIN" inputMode="numeric" maxLength={4} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, ""))} placeholder="示範：2468" />
      </label>
      {status === "error" && <p className="form-error" role="alert">PIN不正確，請再試一次。</p>}
      {status === "verified"
        ? <Link className="button verified-link" to="/parent/dashboard"><Check />驗證成功，進入家長天地</Link>
        : <button className="button" type="submit" disabled={pin.length !== 4}>驗證PIN</button>}
      <small>正式版本會使用限速、鎖定及重新驗證；此頁不儲存PIN。</small>
    </form>
  </main>;
}

export function ParentSetupPage() {
  const [step, setStep] = useState(0);
  const [childName, setChildName] = useState("Mimi");
  const [accepted, setAccepted] = useState(false);
  const complete = step === setupSteps.length;

  return <Shell surface="parent">
    <header className="setup-header">
      <div><DemoBadge label="FIRST-TIME SETUP" /><h1>建立MINIMEE家庭</h1><p>一個家長管理最多{MAX_CHILDREN_PER_PARENT}名孩子；每名孩子獨立訂閱及保存資料。</p></div>
      <StatusPill tone={complete ? "green" : "violet"}>{complete ? "設定完成" : `${step + 1}／${setupSteps.length}`}</StatusPill>
    </header>
    <Progress value={complete ? 100 : ((step + 1) / setupSteps.length) * 100} label="設定進度" />
    <ol className="setup-stepper">{setupSteps.map((label, index) => <li className={index < step ? "done" : index === step ? "active" : ""} key={label}><span>{index < step ? "✓" : index + 1}</span>{label}</li>)}</ol>

    {!complete && <section className="setup-card">
      {step === 0 && <div className="setup-content"><ShieldCheck /><h2>家長是唯一帳戶持有人</h2><p>孩子不會取得電郵、密碼或獨立登入。所有孩子世界都在家長session內切換。</p><div className="rule-box"><LockKeyhole />付款、資料下載、分享及刪除必須重新驗證家長身份。</div></div>}
      {step === 1 && <div className="setup-content"><UserPlus /><h2>建立第一名孩子</h2><label>孩子顯示名稱<input aria-label="孩子顯示名稱" value={childName} onChange={event => setChildName(event.target.value)} /></label><div className="slot-preview"><strong>孩子名額</strong><span className="filled">{childName || "未命名"}</span><span>名額2</span><span>名額3</span></div><small>孩子資料、學習進度、影片及好友不可在兄弟姊妹之間共用。</small></div>}
      {step === 2 && <div className="setup-content"><Sparkles /><h2>{childName}的獨立訂閱</h2><div className="subscription-choice"><StatusPill tone="gold">示範方案</StatusPill><strong>3個月收藏方案</strong><p>此選擇只套用於{childName}。另外新增孩子時需要重新選擇及付款。</p></div><p className="quiet-note">Stripe尚未連接，現在不會收款或建立真實訂閱。</p></div>}
      {step === 3 && <div className="setup-content"><ShieldCheck /><h2>兒童資料與AI製作同意</h2><ul className="consent-list"><li>只為已選主題製作個人化內容</li><li>素材使用私有儲存及短效查看連結</li><li>影片不會自動分享給朋友</li><li>家長可以撤回同意及提出完整下載／刪除</li></ul><label className="check-label"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />我已閱讀示範同意範圍</label></div>}
      <div className="setup-actions">
        <button className="button secondary" onClick={() => setStep(current => Math.max(0, current - 1))} disabled={step === 0}><ChevronLeft />上一步</button>
        <button className="button" onClick={() => setStep(current => current + 1)} disabled={(step === 1 && !childName.trim()) || (step === 3 && !accepted)}>下一步<ChevronRight /></button>
      </div>
    </section>}
    {complete && <section className="setup-complete"><Check /><DemoBadge label="DEMO COMPLETE" /><h2>{childName}的前台設定已準備</h2><p>下一步是連接Supabase Auth、孩子資料、同意紀錄及每名孩子的Stripe訂閱。</p><Link className="button" to="/parent/dashboard">返回家庭總覽</Link></section>}
  </Shell>;
}

const aiStates = [
  ["已排隊", "系統已收到製作要求"],
  ["製作中", "供應商處理個人化影片"],
  ["QC檢查", "自動規格及人工身份連續性檢查"],
  ["需要人工處理", "禮貌通知家長並建立Em處理個案"],
  ["完成", "通過QC後才可派發MEE Card"]
];

export function MediaWorkflowPage() {
  const [assetReady, setAssetReady] = useState(false);
  const [consent, setConsent] = useState(false);

  return <Shell surface="parent">
    <header className="setup-header"><div><DemoBadge label="PRIVATE MEDIA FLOW" /><h1>影片與相片</h1><p>先確認同意及素材，再建立AI工作；目前只操作合成示範，不接受真實兒童素材。</p></div><StatusPill>後端待接</StatusPill></header>
    <div className="media-workflow-grid">
      <section className="media-panel">
        <span className="workflow-number">01</span><ImagePlus /><h2>素材準備</h2>
        <p>正式版本只接受指定格式、大小及清晰度，並儲存在孩子專屬私有路徑。</p>
        <button className="button secondary" onClick={() => setAssetReady(true)}><Upload />{assetReady ? "示範素材已準備" : "使用合成示範素材"}</button>
      </section>
      <section className="media-panel">
        <span className="workflow-number">02</span><ShieldCheck /><h2>家長同意</h2>
        <p>同意紀錄必須包含版本、時間、孩子、用途及撤回狀態。</p>
        <label className="check-label"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />批准這次示範製作</label>
      </section>
    </div>
    <section className="ai-job-panel">
      <div className="block-heading"><div><span className="eyebrow">AI JOB STATE MACHINE</span><h2>影片製作狀態</h2></div><button className="button" disabled={!assetReady || !consent}>建立示範工作</button></div>
      <div className="ai-timeline">{aiStates.map(([title, detail], index) => <article className={index === 3 ? "manual" : ""} key={title}><span>{index + 1}</span><div><strong>{title}</strong><small>{detail}</small></div>{index === 3 && <AlertTriangle />}</article>)}</div>
      <div className="manual-message"><AlertTriangle /><div><strong>客戶看到的訊息</strong><p>我們在製作這段專屬影片時遇到了一點情況，團隊正在為你仔細處理。完成後我們會立即通知你，暫時毋須重新提交資料。</p><small>主題權益保持「已預留」，同時通知Em並建立人工個案。</small></div></div>
    </section>
  </Shell>;
}
