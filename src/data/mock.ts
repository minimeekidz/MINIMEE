export const demoChild = {
  id: "demo-child-01",
  displayName: "Mimi",
  heroName: "星光探險家",
  ageBand: "6–8 歲",
  pet: "Pip",
  activeTheme: "城市小冒險",
  completedNodes: 3,
  totalNodes: 4,
  streak: 6,
  cards: 4
};

export const locations = [
  { name: "我的小屋", path: "/child/room", emoji: "🏠", detail: "英雄、寵物與今期進度" },
  { name: "Mee Library", path: "/child/library", emoji: "📚", detail: "選擇今期學習主題" },
  { name: "Mee Cinema", path: "/child/theatre", emoji: "🎬", detail: "所有學習影片入口" },
  { name: "Hero Studio", path: "/child/hero-studio", emoji: "⚡", detail: "每日詞語與碎片任務" },
  { name: "MEE Album House", path: "/child/albums", emoji: "🃏", detail: "收藏 24 張童年卡牌" },
  { name: "Buddy Café", path: "/child/buddy", emoji: "☕", detail: "照顧寵物與朋友回憶" }
];

export const topics = [
  { title: "城市小冒險", progress: 75, status: "進行中", color: "violet" },
  { title: "海洋研究所", progress: 0, status: "等待家長選擇", color: "blue" },
  { title: "夜行觀察家", progress: 100, status: "已完成", color: "gold" }
];

export const notifications = [
  { title: "最後一塊碎片等緊 Mimi", meta: "Hero Studio · 今日", tone: "violet" },
  { title: "城市小冒險學習影片已準備", meta: "Mee Cinema · 昨日", tone: "blue" },
  { title: "MEE 卡 09 已加入紀念冊", meta: "Album House · 2 日前", tone: "gold" }
];

export const activeFriends = [
  { id: "friend-01", displayName: "Noah", icon: "🐧", connectedAt: "2026-06-18" }
];

export const friendHistory = [
  { id: "friend-history-01", displayName: "Ava", icon: "🐰", disconnectedAt: "2026-05-02" }
];

export const adminModules = [
  ["內容與主題", "36 個主題版本、詞彙、問題與發布狀態", "/admin/content"],
  ["資產中心", "卡牌、角色、影片與缺檔追蹤", "/admin/assets"],
  ["AI 工作", "任務佇列、成本、重試與人工接管", "/admin/ai-jobs"],
  ["QC 檢查", "自動規格與人物連續性人工審核", "/admin/qc"],
  ["客服個案", "缺陷、重做、退款及處理時限", "/admin/support"],
  ["商務營運", "訂閱、付款、退款與 webhook", "/admin/commerce"],
  ["私隱要求", "匯出、撤回、刪除與保留期", "/admin/privacy"],
  ["審計記錄", "敏感操作原因、case ID 與結果", "/admin/audit"]
];

export const cards: Record<number, string> = {
  1: "/assets/card-01.webp",
  5: "/assets/card-05.webp",
  9: "/assets/card-09.webp",
  11: "/assets/card-11.webp"
};
