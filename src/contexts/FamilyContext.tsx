import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MAX_CHILDREN_PER_PARENT } from "../domain/rules";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export type ChildRecord = {
  id: string;
  parent_id: string;
  nickname: string;
  birth_year: number | null;
  age_group: "3-5" | "6-8" | "9-12" | "13+" | null;
  interests: string[];
  preferred_language: "zh-HK" | "zh-CN" | "en";
  created_at: string;
  updated_at: string;
};

export type NewChild = Pick<ChildRecord, "nickname" | "birth_year" | "age_group" | "interests" | "preferred_language">;

type FamilyContextValue = {
  children: ChildRecord[];
  loading: boolean;
  error: string | null;
  canAddChild: boolean;
  refresh: () => Promise<void>;
  createChild: (child: NewChild) => Promise<ChildRecord>;
};

const FamilyContext = createContext<FamilyContextValue | null>(null);

function friendlyError(message: string) {
  if (message.includes("at most three children")) return "每個家長帳戶最多只可管理 3 名孩子。";
  return "未能儲存孩子資料，請稍後再試。";
}

export function FamilyProvider({ children: content }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !supabase) {
      setChildren([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("children")
      .select("*")
      .eq("parent_id", user.id)
      .order("created_at", { ascending: true });
    if (queryError) {
      console.error("Unable to load MINIMEE children", queryError.message);
      setError("未能載入家庭資料，請重新整理。");
    } else {
      setChildren((data ?? []) as ChildRecord[]);
      setError(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) void refresh();
  }, [authLoading, refresh]);

  const value = useMemo<FamilyContextValue>(() => ({
    children,
    loading,
    error,
    canAddChild: children.length < MAX_CHILDREN_PER_PARENT,
    refresh,
    createChild: async child => {
      if (!user || !supabase) throw new Error("家長登入連線尚未準備。");
      if (children.length >= MAX_CHILDREN_PER_PARENT) throw new Error("每個家長帳戶最多只可管理 3 名孩子。");
      const payload = { ...child, nickname: child.nickname.trim(), parent_id: user.id };
      const { data, error: insertError } = await supabase.from("children").insert(payload).select("*").single();
      if (insertError) {
        console.error("Unable to create MINIMEE child", insertError.message);
        throw new Error(friendlyError(insertError.message));
      }
      const created = data as ChildRecord;
      setChildren(current => [...current, created]);
      return created;
    },
  }), [children, error, loading, refresh, user]);

  return <FamilyContext.Provider value={value}>{content}</FamilyContext.Provider>;
}

export function useFamily() {
  const value = useContext(FamilyContext);
  if (!value) throw new Error("useFamily must be used inside FamilyProvider");
  return value;
}
