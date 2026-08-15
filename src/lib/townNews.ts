import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { NewsItem } from "../components/interior/HomePanels";

// The 公告板.
//
// Two kinds in one table, never mixed on screen. 最新消息 is MINIMEE speaking;
// 小鎮趣聞 is a pet telling a story and is labelled as invented. Keeping the
// kind non-null in the schema is what makes that separation impossible to
// lose by accident.

export function useTownNews(): { news: NewsItem[]; loading: boolean } {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let live = true;
    void (async () => {
      const { data } = await supabase
        .from("town_news")
        .select("id, kind, title, body, published_at")
        .eq("active", true)
        .order("published_at", { ascending: false })
        .limit(20);
      if (!live) return;
      setNews((data ?? []).map(row => ({
        id: row.id as string,
        kind: (row.kind as NewsItem["kind"]) ?? "announcement",
        title: (row.title as string) ?? "",
        body: (row.body as string) ?? "",
        publishedAt: (row.published_at as string) ?? new Date().toISOString(),
      })));
      setLoading(false);
    })();
    return () => { live = false; };
  }, []);

  return { news, loading };
}
