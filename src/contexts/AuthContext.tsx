import { Session, User } from "@supabase/supabase-js";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { initializeSupabase, supabase } from "../lib/supabase";

export type AppRole = "parent" | "admin";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadRole(userId: string): Promise<AppRole | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Unable to load MINIMEE role", error.message);
    return null;
  }
  return data?.role === "admin" ? "admin" : data?.role === "parent" ? "parent" : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  async function refreshRole() {
    if (!session?.user) {
      setRole(null);
      return;
    }
    setRole(await loadRole(session.user.id));
  }

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    initializeSupabase().then(async client => {
      if (!active || !client) {
        setLoading(false);
        return;
      }
      setConfigured(true);
      const { data, error } = await client.auth.getSession();
      if (!active) return;
      if (error) console.error("Unable to restore MINIMEE session", error.message);
      const nextSession = data.session ?? null;
      setSession(nextSession);
      setRole(nextSession?.user ? await loadRole(nextSession.user.id) : null);
      setLoading(false);

      const { data: listener } = client.auth.onAuthStateChange((_event, changedSession) => {
        setSession(changedSession);
        if (!changedSession?.user) {
          setRole(null);
          setLoading(false);
          return;
        }
        window.setTimeout(async () => {
          if (!active) return;
          setRole(await loadRole(changedSession.user.id));
          setLoading(false);
        }, 0);
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      session,
      user: session?.user ?? null,
      role,
      refreshRole,
      signOut: async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [configured, loading, role, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
