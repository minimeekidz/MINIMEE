import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Database, FileWarning, Gauge, Search, ShieldCheck, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardHeader, DemoBadge, IntegrationNotice, Progress, Shell, StatusPill } from "../components/UI";
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
  const [filter, setFilter] = useState("全部");
  const workspaceRows: Record<string, string[][]> = {
    content: [["城市小冒險 v1","已發布","4詞／4題"],["海洋研究所 v2","草稿","4詞／4題"]],
    assets: [["MEE Card 09","已備妥","WebP"],["MEE Card 12–24","缺少","待正式資產"]],
    "ai-jobs": [["AI-DEMO-104","需要人工處理","權益已預留"],["AI-DEMO-103","QC檢查","不派卡"]],
    qc: [["QC-DEMO-88","待身份連續性檢查","1280×720／30fps"],["QC-DEMO-87","通過","可派發"]],
    support: [["CASE-DEMO-21","處理中","AI影片失敗"],["CASE-DEMO-20","已解決","家長已通知"]],
    commerce: [["SUB-DEMO-MIMI","有效","獨立孩子訂閱"],["EVT-DEMO-001","已去重","Webhook"]],
    privacy: [["PRIV-DEMO-9","Day 90","下載提醒"],["EXPORT-DEMO-4","待處理","短效連結"]],
    audit: [["AUDIT-DEMO-31","管理員人工接管","CASE-DEMO-21"],["AUDIT-DEMO-30","分享撤銷","已遮罩"]]
  };
  const rows = workspaceRows[kind];
  return <Shell surface="admin"><DashboardHeader title={title} /><div className="admin-workspace">
    <div className="workspace-head"><div><DemoBadge label="SYNTHETIC OPERATIONS" /><h2>{detail}</h2></div><div className="admin-toolbar"><label><Search /><input aria-label="搜尋工作台" placeholder="搜尋ID或狀態" /></label><select aria-label="工作台篩選" value={filter} onChange={event => setFilter(event.target.value)}><option>全部</option><option>待處理</option><option>已完成</option></select></div></div>
    <div className="workspace-columns"><article><StatusPill tone="green">已鎖定規格</StatusPill><h3>驗收護欄</h3>{checks.map((x, i) => <div className="check-row" key={x}>{i === 0 ? <CheckCircle2 /> : <Clock3 />}<span>{x}</span></div>)}</article>
    <article><Gauge /><h3>數據來源未接通</h3><Progress value={0} label="真實整合" /><p>工作台使用合成資料，只驗證營運版面及狀態。</p></article></div>
    <section className="admin-table" aria-label={`${title}示範列表`}><div className="admin-table-head"><span>記錄</span><span>狀態</span><span>詳情</span><span>操作</span></div>{rows.map(([id,status,meta]) => <div className="admin-table-row" key={id}><strong>{id}</strong><StatusPill tone={status.includes("通過") || status.includes("有效") || status.includes("已發布") ? "green" : status.includes("人工") || status.includes("待") ? "gold" : "violet"}>{status}</StatusPill><small>{meta}</small><button disabled>待資料接駁</button></div>)}</section>
  </div></Shell>;
}
