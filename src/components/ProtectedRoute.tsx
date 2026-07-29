import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children: ReactNode;
  requireAdmin?: boolean;
}) {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.configured) {
    return <Navigate to="/login" replace state={{ from: location.pathname, reason: "not-configured" }} />;
  }
  if (auth.loading) {
    return <main className="not-found"><span>•••</span><h1>正在確認家長身份</h1></main>;
  }
  if (!auth.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!auth.role) {
    return <main className="not-found"><span>!</span><h1>帳戶權限尚未準備完成</h1></main>;
  }
  if (requireAdmin && auth.role !== "admin") {
    return <Navigate to="/parent/dashboard" replace />;
  }
  return <>{children}</>;
}

