import { AuthError } from "@supabase/supabase-js";
import { Check } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { DemoBadge } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import { supabase, supabaseSetupError } from "../lib/supabase";

type AuthMode = "login" | "register" | "forgot" | "reset";

function messageFor(error: AuthError | Error) {
  const text = error.message.toLowerCase();
  if (text.includes("invalid login credentials")) return "電郵或密碼不正確。";
  if (text.includes("email not confirmed")) return "請先到電郵信箱完成驗證。";
  if (text.includes("user already registered")) return "這個電郵已建立帳戶，請直接登入。";
  if (text.includes("password")) return "密碼最少需要8個字元。";
  return "暫時未能完成要求，請稍後再試。";
}

export function AuthPage() {
  const { pathname, state } = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const mode: AuthMode = pathname.includes("register")
    ? "register"
    : pathname.includes("forgot")
      ? "forgot"
      : pathname.includes("reset-password")
        ? "reset"
        : "login";
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (auth.user && mode === "login") return <Navigate to="/parent/dashboard" replace />;

  const title = mode === "register"
    ? "建立家長帳戶"
    : mode === "forgot"
      ? "重設密碼"
      : mode === "reset"
        ? "設定新密碼"
        : "歡迎家長回來";
  const detail = mode === "register"
    ? "只有家長擁有登入帳戶；孩子不會建立獨立登入。"
    : mode === "forgot"
      ? "輸入家長電郵，我們會寄出短效重設連結。"
      : mode === "reset"
        ? "請設定最少8個字元的新密碼。"
        : "登入後管理孩子的主題、影片、收藏及分享權限。";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!supabase) {
      // Say which of the two it is. 「請重新部署」 was advice that did not
      // work — the deploy was fine, one of the values was.
      setError(supabaseSetupError
        ? `連唔到資料庫：${supabaseSetupError}`
        : "連唔到資料庫，請稍後再試。");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        const from = (state as { from?: string } | null)?.from;
        navigate(from?.startsWith("/") ? from : "/parent/dashboard", { replace: true });
        return;
      }
      if (mode === "register") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/parent/dashboard` },
        });
        if (signUpError) throw signUpError;
        setSubmitted(true);
        return;
      }
      if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setSubmitted(true);
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSubmitted(true);
    } catch (caught) {
      setError(messageFor(caught instanceof Error ? caught : new Error("Unknown auth error")));
    } finally {
      setLoading(false);
    }
  }

  const successTitle = mode === "forgot"
    ? "重設連結已寄出"
    : mode === "register"
      ? "請驗證家長電郵"
      : "密碼已更新";
  const successDetail = mode === "forgot"
    ? "如該電郵已有帳戶，數分鐘內會收到重設連結。"
    : mode === "register"
      ? "完成電郵驗證後便可登入家長天地。"
      : "你現在可以使用新密碼登入。";

  return (
    <div className="auth-page">
      <Link className="brand" to="/"><span className="brand-mark">M</span><span>MINIMEE</span></Link>
      <form className="auth-card" onSubmit={submit}>
        <DemoBadge label={auth.configured ? "SECURE PARENT ACCESS" : "SUPABASE SETUP REQUIRED"} />
        <h1>{title}</h1><p>{detail}</p>
        {error && <div className="auth-error" role="alert">{error}</div>}
        {!submitted ? <>
          {mode !== "reset" && <label>電郵地址<input aria-label="家長電郵地址" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="parent@example.com" /></label>}
          {mode !== "forgot" && <label>{mode === "reset" ? "新密碼" : "密碼"}<div className="password-field"><input aria-label={mode === "reset" ? "新密碼" : "家長密碼"} type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={event => setPassword(event.target.value)} placeholder="最少8個字元" /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? "隱藏" : "顯示"}</button></div></label>}
          {mode === "register" && <label className="check-label"><input type="checkbox" required />我確認這是家長帳戶，並同意在上載兒童資料前閱讀私隱條款</label>}
          <button className="button" type="submit" disabled={loading}>{loading ? "處理中…" : mode === "register" ? "建立家長帳戶" : mode === "forgot" ? "發送重設連結" : mode === "reset" ? "儲存新密碼" : "登入"}</button>
        </> : <div className="auth-success" role="status"><Check /><div><strong>{successTitle}</strong><p>{successDetail}</p></div></div>}
        <div className="auth-links">
          {mode !== "login" && <Link to="/login">返回登入</Link>}
          {mode === "login" && <><Link to="/forgot-password">忘記密碼</Link><Link to="/register">建立家長帳戶</Link></>}
        </div>
      </form>
    </div>
  );
}

