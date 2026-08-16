// What is inside each building, and where on the art it is.
//
// Every position here was read off the copies Em annotated — the ones under
// public/assets/uploads/場景/ with the yellow labels and the drawn route. The
// labels are the specification: 「更新我的卡片」 sits on the desk in 我的小屋
// because that is where she wrote it, not because a desk seemed like a
// sensible place for it.
//
// Interiors are not walked around. Em's rule is 原位入口原位出口: you step in,
// the room is one picture, you tap what you came for, and you step back out
// where you came from. Only the outdoor zones have a walk mask.

export type SpotKind =
  /** Opens a panel drawn over the scene. */
  | "panel"
  /** Walks into another interior — the 珍藏館 wings, the 戲院 behind its lobby. */
  | "room"
  /** Leaves the world for an existing page (the parent services, the card). */
  | "route";

export interface InteriorSpot {
  id: string;
  label: string;
  /** Normalised position on the art, where the marker sits. */
  x: number;
  y: number;
  kind: SpotKind;
  target: string;
  /** Shown under the label on the marker, one short line. */
  hint?: string;
}

export interface Interior {
  id: string;
  name: string;
  art: string;
  /** Where leaving goes back to, and which side the door is drawn on. */
  back: { kind: "zone" | "room"; target: string; side: "left" | "right" | "bottom" };
  spots: InteriorSpot[];
  /** 碼頭市集's rooms sit behind the parent PIN. */
  parentsOnly?: boolean;
}

export const INTERIORS: Record<string, Interior> = {
  // --- MEE 珍藏館 -----------------------------------------------------------
  // 「主廳係只會一禁就show所有己獲得的卡」 — the hall is the whole collection,
  // and its two arches are the wings.
  "album-hall": {
    id: "album-hall",
    name: "MEE 珍藏館",
    art: "/assets/world/album-hall.webp",
    back: { kind: "zone", target: "town-centre", side: "bottom" },
    spots: [
      { id: "all-cards", label: "我全部嘅卡", x: 0.50, y: 0.45, kind: "panel", target: "all-cards", hint: "一禁就睇晒" },
      { id: "to-fragments", label: "碎片拼合室", x: 0.16, y: 0.52, kind: "room", target: "fragment-room", hint: "儲碎片砌卡" },
      { id: "to-books", label: "卡冊珍藏館", x: 0.84, y: 0.52, kind: "room", target: "album-books", hint: "一冊冊咁揭" },
    ],
  },
  "album-books": {
    id: "album-books",
    name: "卡冊珍藏館",
    art: "/assets/world/album-books.webp",
    // The art's usable archway is on the right in both wings, so both return
    // doors are drawn there.
    back: { kind: "room", target: "album-hall", side: "right" },
    spots: [
      { id: "books", label: "揀一本卡冊", x: 0.50, y: 0.42, kind: "panel", target: "books", hint: "每冊六張" },
    ],
  },
  "fragment-room": {
    id: "fragment-room",
    name: "碎片拼合室",
    art: "/assets/world/fragment-room.webp",
    back: { kind: "room", target: "album-hall", side: "right" },
    spots: [
      { id: "trays", label: "碎片主題盤", x: 0.50, y: 0.40, kind: "panel", target: "trays", hint: "四塊砌一張" },
    ],
  },

  // --- Hero Studio ---------------------------------------------------------
  "studio": {
    id: "studio",
    name: "Hero Studio",
    art: "/assets/world/studio.webp",
    back: { kind: "zone", target: "town-centre", side: "bottom" },
    spots: [
      { id: "current-words", label: "答問題", x: 0.50, y: 0.62, kind: "panel", target: "current-words", hint: "睇完片就嚟呢度" },
      { id: "to-cinema", label: "戲院大堂", x: 0.16, y: 0.36, kind: "room", target: "cinema-lobby", hint: "睇片" },
      { id: "to-library", label: "MEE 圖書館", x: 0.85, y: 0.36, kind: "room", target: "library", hint: "重溫舊詞語" },
    ],
  },
  "library": {
    id: "library",
    name: "MEE 圖書館",
    art: "/assets/world/library.webp",
    back: { kind: "room", target: "studio", side: "bottom" },
    spots: [
      { id: "past-words", label: "過往詞語重溫", x: 0.50, y: 0.55, kind: "panel", target: "past-words", hint: "由頭睇返" },
    ],
  },
  "cinema-lobby": {
    id: "cinema-lobby",
    name: "戲院大堂",
    art: "/assets/world/cinema-lobby.webp",
    back: { kind: "room", target: "studio", side: "bottom" },
    spots: [
      { id: "tickets", label: "接待處", x: 0.36, y: 0.58, kind: "panel", target: "tickets", hint: "同職員揀套片" },
      { id: "to-hall", label: "入場", x: 0.64, y: 0.52, kind: "room", target: "cinema-hall", hint: "行入去睇" },
    ],
  },
  "cinema-hall": {
    id: "cinema-hall",
    name: "戲院",
    art: "/assets/world/cinema-hall.webp",
    back: { kind: "room", target: "cinema-lobby", side: "bottom" },
    spots: [
      { id: "screen", label: "銀幕", x: 0.50, y: 0.28, kind: "panel", target: "screen", hint: "睇片" },
    ],
  },

  // --- Buddy Café ----------------------------------------------------------
  // 「Buddy Cafe係掃好友QRCode的功能入口，入到去唔洗行」.
  "cafe": {
    id: "cafe",
    name: "Buddy Café",
    art: "/assets/world/cafe.webp",
    back: { kind: "zone", target: "town-centre", side: "bottom" },
    spots: [
      { id: "friend-scan", label: "好友掃 code", x: 0.45, y: 0.50, kind: "panel", target: "friend-scan", hint: "加返個新朋友" },
    ],
  },

  // --- 我的小屋 -------------------------------------------------------------
  "my-home": {
    id: "my-home",
    name: "我的小屋",
    art: "/assets/world/my-home.webp",
    back: { kind: "zone", target: "village-gate", side: "bottom" },
    spots: [
      { id: "about-me", label: "關於我", x: 0.30, y: 0.55, kind: "panel", target: "about-me", hint: "我張卡" },
      { id: "update-card", label: "更新我的卡片", x: 0.80, y: 0.62, kind: "panel", target: "update-card", hint: "貼紙同分享" },
      { id: "friends", label: "我的好友冊", x: 0.16, y: 0.76, kind: "panel", target: "friends", hint: "見過邊個" },
    ],
  },
};

// --- 碼頭市集 --------------------------------------------------------------
// The stalls Em labelled on uploads/場景/7.webp. These are the parents'
// services and every one of them already exists as a page, so the market is a
// way in rather than a new set of screens.
export interface Stall {
  id: string;
  label: string;
  hint: string;
  x: number;
  y: number;
  /** `:id` is filled in with the child's id. */
  route: string;
}

export const WHARF_STALLS: Stall[] = [
  { id: "card-desk", label: "管理自我介紹卡", hint: "上載影片與相片", x: 0.20, y: 0.58, route: "/parent/children/:id/card" },
  { id: "new-child", label: "新增孩子檔案", hint: "開多一個小朋友", x: 0.47, y: 0.45, route: "/parent/dashboard" },
  { id: "harbour", label: "付款訂閱", hint: "計劃同續期", x: 0.72, y: 0.50, route: "/parent/children/:id/subscription" },
  { id: "lost", label: "認領失物區", hint: "開啟遺失模式", x: 0.82, y: 0.63, route: "/parent/children/:id/lost-items" },
  { id: "security", label: "保安", hint: "條例規則及注意事項", x: 0.80, y: 0.80, route: "/parent/privacy" },
];

export function stallRoute(stall: Stall, childId: string): string {
  return stall.route.replace(":id", childId);
}
