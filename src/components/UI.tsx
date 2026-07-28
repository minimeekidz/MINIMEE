import { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Bell, ChevronRight, CloudOff, LockKeyhole, Menu, ShieldCheck, Sparkles
} from "lucide-react";

export function DemoBadge({ label = "DEMO DATA" }: { label?: string }) {
  return <span className="demo-badge">{label}</span>;
}

export function StatusPill({ children, tone = "violet" }: { children: ReactNode; tone?: string }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

export function Progress({ value, label }: { value: number; label?: string }) {
  return (
    <div className="progress-wrap" aria-label={label ?? `完成 ${value}%`}>
      <div className="progress-meta"><span>{label}</span><strong>{value}%</strong></div>
      <div className="progress-track"><span style={{ width: `${value}%` }} /></div>
    </div>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="state-card">
      <CloudOff size={28} />
      <div><strong>{title}</strong><p>{detail}</p></div>
    </div>
  );
}

export function PublicHeader() {
  return (
    <header className="public-header">
      <Link className="brand" to="/"><span className="brand-mark">M</span><span>MINIMEE</span></Link>
      <nav aria-label="主要導覽">
        <NavLink to="/how-it-works">玩法</NavLink>
        <NavLink to="/pricing">方案</NavLink>
        <NavLink to="/faq">FAQ</NavLink>
      </nav>
      <Link className="button small" to="/login">家長登入</Link>
      <button className="icon-button mobile-only" aria-label="開啟選單"><Menu /></button>
    </header>
  );
}

export function DashboardHeader({ title, child = false }: { title: string; child?: boolean }) {
  return (
    <header className="dashboard-header">
      <div>
        <DemoBadge />
        <h1>{title}</h1>
      </div>
      <div className="header-actions">
        {child && <StatusPill tone="green">Mimi</StatusPill>}
        <button className="icon-button" aria-label="通知"><Bell /></button>
        <div className="avatar">EM</div>
      </div>
    </header>
  );
}

export function SideNav({ surface }: { surface: "parent" | "admin" }) {
  const parent = [
    ["總覽", "/parent/dashboard"], ["小朋友", "/parent/children/demo-child-01"],
    ["學習主題", "/parent/children/demo-child-01/themes"], ["影片與相片", "/parent/media"],
    ["MEE 紀念冊", "/parent/albums"], ["好友及分享", "/parent/children/demo-child-01/sharing"],
    ["付款與訂閱", "/parent/children/demo-child-01/subscription"], ["私隱與下載", "/parent/privacy"]
  ];
  const admin = [
    ["營運總覽", "/admin"], ["內容管理", "/admin/content"], ["資產中心", "/admin/assets"],
    ["AI 工作", "/admin/ai-jobs"], ["QC", "/admin/qc"], ["客服", "/admin/support"],
    ["商務", "/admin/commerce"], ["私隱", "/admin/privacy"], ["審計", "/admin/audit"]
  ];
  const links = surface === "parent" ? parent : admin;
  return (
    <aside className="side-nav">
      <Link className="brand" to="/"><span className="brand-mark">M</span><span>MINIMEE</span></Link>
      <div className="surface-label">{surface === "parent" ? "家長天地" : "ADMIN CONSOLE"}</div>
      <nav aria-label={`${surface} 導覽`}>
        {links.map(([label, path]) => (
          <NavLink key={path} to={path} end={path === "/admin" || path.endsWith("dashboard")}>
            <span>{label}</span><ChevronRight size={15} />
          </NavLink>
        ))}
      </nav>
      <div className="secure-note"><ShieldCheck size={18} /><span>兒童資料不存於此 Demo</span></div>
    </aside>
  );
}

export function Shell({ surface, children }: { surface: "parent" | "admin"; children: ReactNode }) {
  return <div className="dashboard-shell"><SideNav surface={surface} /><main className="dashboard-main">{children}</main></div>;
}

export function FeatureCard({ title, detail, to, icon }: { title: string; detail: string; to: string; icon?: ReactNode }) {
  return (
    <Link className="feature-card" to={to}>
      <span className="feature-icon">{icon ?? <Sparkles />}</span>
      <span><strong>{title}</strong><small>{detail}</small></span>
      <ChevronRight size={18} />
    </Link>
  );
}

export function IntegrationNotice() {
  return (
    <div className="integration-notice">
      <LockKeyhole size={20} />
      <div><strong>前台示範模式</strong><p>介面與路由可操作；登入、付款、媒體、AI 及資料庫尚未連接。</p></div>
    </div>
  );
}
