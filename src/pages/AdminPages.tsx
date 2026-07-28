import { AlertTriangle, CheckCircle2, Clock3, Database, FileWarning, Gauge, ShieldCheck, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardHeader, DemoBadge, EmptyState, IntegrationNotice, Progress, Shell, StatusPill } from "../components/UI";
import { adminModules } from "../data/mock";

export function AdminDashboard() {
  return <Shell surface="admin"><DashboardHeader title="MINIMEE 營運總覽" /><IntegrationNotice />
  <div className="metric-grid">
    {[["36", "主題規格", "12 待資產", <Database />], ["4/24", "卡位有示範圖", "10、12–24 缺檔", <FileWarning />], ["0", "真實兒童資料", "安全", <ShieldCheck />], ["—", "AI 成本", "待供應商連接", <WalletCards />]].map(([v, l, m, icon]) => <article key={String(l)}><span>{icon}</span><strong>{v}</strong><p>{l}</p><small>{m}</small></article>)}
  </div>
  <section className="section-block"><div className="block-heading"><div><span className="eyebrow">ROUTE MAP</span><h2>後台工作區</h2></div></div><div className="admin-module-grid">{adminModules.map(([title, detail, path]) => <Link key={path} to={path}><strong>{title}</strong><p>{detail}</p><span>打開工作區 →</span></Link>)}</div></section>
  <section className="risk-strip"><AlertTriangle /><div><strong>上線阻擋仍生效</strong><p>RLS、私有 Storage、Stripe webhook、供應商批核、同意及 180 日刪除測試通過前，不得收真實款項或上載真實兒童素材。</p></div></section>
  </Shell>;
}

const adminInfo: Record<string, [string, string, string[]]> = {
  content: ["內容與主題", "管理 36 個主題的版本、詞彙、問題及發布狀態。", ["36 主題 × 3 年齡狀態", "正好 4 詞驗證", "DRAFT → PUBLISHED"]],
  assets: ["資產中心", "追蹤角色、卡牌、影片、授權、格式與缺檔。", ["4/24 卡位有示範", "WebP 副檔名需修正", "商用權待確認"]],
  "ai-jobs": ["AI 工作佇列", "供應商中立的工作、成本、重試及人工接管介面。", ["0 個真實工作", "Provider 未批准", "Test adapter 待接"]],
  qc: ["影片 QC", "自動規格檢查及人物身份、物理連續性人工審核。", ["1280×720", "12–15 秒", "30 fps"]],
  support: ["客服個案", "缺陷、重做、退款、證據與處理時限。", ["Case ID 必填", "操作理由必填", "所有變更審計"]],
  commerce: ["商務營運", "訂閱、付款、退款、拒付與 webhook 狀態。", ["只信已驗證 webhook", "event id 去重", "權益交易鎖定"]],
  privacy: ["私隱與保留期", "同意、資料匯出、分享撤回及 180 日刪除。", ["Day 0 / 90 / 150 / 173", "Day 180 purge", "短效 export URL"]],
  audit: ["審計記錄", "管理員敏感操作的角色、理由、case 及結果。", ["不可記錄 secrets", "不可記錄 signed URL", "兒童內容需遮罩"]]
};

export function AdminModulePage({ kind }: { kind: string }) {
  const [title, detail, checks] = adminInfo[kind];
  return <Shell surface="admin"><DashboardHeader title={title} /><div className="admin-workspace">
    <div className="workspace-head"><div><DemoBadge label="FRONTEND SHELL" /><h2>{detail}</h2></div><button className="button" disabled>待 Supabase 連接</button></div>
    <div className="workspace-columns"><article><StatusPill tone="green">已鎖定規格</StatusPill><h3>驗收護欄</h3>{checks.map((x, i) => <div className="check-row" key={x}>{i === 0 ? <CheckCircle2 /> : <Clock3 />}<span>{x}</span></div>)}</article>
    <article><Gauge /><h3>數據來源未接通</h3><Progress value={0} label="真實整合" /><p>頁面不會以 mock button 偽裝資料已寫入。</p></article></div>
    <EmptyState title="暫無營運資料" detail="這是合成前台狀態；接入經 RLS 保護的資料源後再啟用列表及操作。" />
  </div></Shell>;
}
