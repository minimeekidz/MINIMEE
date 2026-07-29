import { FormEvent, useState } from "react";
import { AlertTriangle, Check, ChevronLeft, ImagePlus, KeyRound, LockKeyhole, ShieldCheck, Upload, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { DemoBadge, Progress, Shell, StatusPill } from "../components/UI";
import { MAX_CHILDREN_PER_PARENT } from "../domain/rules";
import { NewChild, useFamily } from "../contexts/FamilyContext";

const defaultChild: NewChild = {
  nickname: "",
  birth_year: null,
  age_group: null,
  interests: [],
  preferred_language: "zh-HK",
};

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
  const navigate = useNavigate();
  const { children, canAddChild, createChild } = useFamily();
  const [form, setForm] = useState<NewChild>(defaultChild);
  const [interestText, setInterestText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveChild(event: FormEvent) {
    event.preventDefault();
    if (!form.nickname.trim() || !canAddChild) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createChild({
        ...form,
        interests: interestText.split(/[、,，]/).map(value => value.trim()).filter(Boolean).slice(0, 8),
      });
      navigate(`/parent/children/${created.id}`, { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "未能建立孩子檔案。");
      setSaving(false);
    }
  }

  return <Shell surface="parent">
    <header className="setup-header">
      <div><DemoBadge label="SECURE CHILD PROFILE" /><h1>新增孩子檔案</h1><p>一個家長管理最多{MAX_CHILDREN_PER_PARENT}名孩子；孩子沒有獨立登入，每名孩子的資料及日後訂閱互相獨立。</p></div>
      <StatusPill tone={canAddChild ? "violet" : "gold"}>{children.length}／{MAX_CHILDREN_PER_PARENT} 名孩子</StatusPill>
    </header>
    <Progress value={(children.length / MAX_CHILDREN_PER_PARENT) * 100} label="家庭孩子名額" />
    {!canAddChild ? <section className="setup-complete"><ShieldCheck /><DemoBadge label="FAMILY LIMIT" /><h2>已建立 3 名孩子</h2><p>這是帳戶及資料庫共同執行的上限。每名孩子仍需獨立訂閱。</p><Link className="button" to="/parent/dashboard">返回家庭總覽</Link></section>
      : <form className="setup-card" onSubmit={saveChild}>
        <div className="setup-content child-form">
          <UserPlus /><h2>孩子基本資料</h2>
          <p>現階段只儲存基本檔案，不會收款、上載相片、建立 AI 影片或記錄媒體同意。</p>
          <label>孩子顯示名稱（必填）
            <input aria-label="孩子顯示名稱" maxLength={40} required value={form.nickname} onChange={event => setForm(current => ({ ...current, nickname: event.target.value }))} placeholder="例如：Mimi" />
          </label>
          <div className="form-pair">
            <label>出生年份（選填）
              <input aria-label="出生年份" inputMode="numeric" min="2000" max="2100" type="number" value={form.birth_year ?? ""} onChange={event => setForm(current => ({ ...current, birth_year: event.target.value ? Number(event.target.value) : null }))} />
            </label>
            <label>年齡組（選填）
              <select aria-label="年齡組" value={form.age_group ?? ""} onChange={event => setForm(current => ({ ...current, age_group: (event.target.value || null) as NewChild["age_group"] }))}>
                <option value="">稍後設定</option><option value="3-5">3–5 歲</option><option value="6-8">6–8 歲</option><option value="9-12">9–12 歲</option><option value="13+">13 歲或以上</option>
              </select>
            </label>
          </div>
          <label>主要語言
            <select aria-label="主要語言" value={form.preferred_language} onChange={event => setForm(current => ({ ...current, preferred_language: event.target.value as NewChild["preferred_language"] }))}>
              <option value="zh-HK">粵語</option><option value="zh-CN">普通話</option><option value="en">English</option>
            </select>
          </label>
          <label>興趣（選填，以逗號或頓號分隔）
            <input aria-label="孩子興趣" value={interestText} onChange={event => setInterestText(event.target.value)} placeholder="例如：恐龍、海洋、交通工具" />
          </label>
          <div className="rule-box"><LockKeyhole />只有目前登入的家長及獲授權管理員可讀取這個檔案。</div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <div className="setup-actions">
          <Link className="button secondary" to="/parent/dashboard"><ChevronLeft />返回</Link>
          <button className="button" type="submit" disabled={saving || !form.nickname.trim()}>{saving ? "正在安全儲存…" : "建立孩子檔案"}<Check /></button>
        </div>
      </form>}
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
