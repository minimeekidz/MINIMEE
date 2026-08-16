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
  | "route"
  /** Somewhere to sit. Costs nothing, earns nothing, says what you can see. */
  | "seat"
  /** Something to eat or drink. Same rule as a seat. */
  | "treat"
  /** Drawn in the art, not built yet. Says so rather than doing nothing. */
  | "soon";

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
  /**
   * The line a seat, a treat, or a not-yet-built thing shows when tapped.
   * Lives on the spot so the room owns its own words — the same reason the
   * park's benches carry theirs.
   */
  note?: string;
}

export interface Interior {
  id: string;
  name: string;
  art: string;
  /**
   * The same room after dark. Em paints both; a lit café at midnight is the
   * kind of small wrongness a child notices without being able to name it.
   * Rooms without a night cut just stay on `art`.
   */
  artNight?: string;
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
  //
  // Em's new art (2026-08-16), and it answers the two functions she named by
  // itself. 「1是讓小朋友與小朋友之間互掃 qrcode 加好友及同意加入好友的」 is
  // the round table in the middle: two handheld consoles facing each other
  // across a little divider, which is exactly two children swapping codes.
  // 「2是可以看小寵物的最新消息／趣聞」 is the pinned board on the upper
  // right wall, with the paw and the star and the heart above it.
  //
  // The rest is what makes it a café rather than a menu: 「舒適又有不同活動及
  // 坐位進食（有坐下的互動鍵）、吸引的甜點及飲品（有進食的互動鍵）」. Three
  // places to sit, one counter to order from, and none of them pay anything —
  // same rule as the park benches and the 廣場 stage.
  "cafe": {
    id: "cafe",
    name: "Buddy Café",
    art: "/assets/world/cafe.webp",
    artNight: "/assets/world/cafe-night.webp",
    back: { kind: "zone", target: "town-centre", side: "bottom" },
    spots: [
      { id: "friend-scan", label: "換好友 code", x: 0.470, y: 0.455, kind: "panel", target: "friend-scan", hint: "面對面坐低換" },
      { id: "pet-news", label: "小寵物消息板", x: 0.800, y: 0.140, kind: "panel", target: "pet-news", hint: "小鎮最新趣聞" },
      { id: "treats", label: "甜品櫃", x: 0.150, y: 0.310, kind: "treat", target: "treats", hint: "揀樣嘢食" },
      { id: "seat-booth", label: "靠窗卡座", x: 0.500, y: 0.275, kind: "seat", target: "booth",
        note: "坐入綠色嘅卡座，窗外望到成個海港同燈塔。太陽曬到張枱暖暖地。" },
      { id: "seat-sofa", label: "紅色梳化", x: 0.855, y: 0.480, kind: "seat", target: "sofa",
        note: "梳化好軟，攬枕堆到頸咁高。隔籬張細枱插住一支花。" },
      { id: "seat-cushions", label: "地墊角落", x: 0.170, y: 0.660, kind: "seat", target: "cushions",
        note: "一堆彩色軟墊喺地氈上面。坐低就唔想起身，成間 café 嘅聲都變咗細細聲。" },
    ],
  },

  // --- 我的小屋 -------------------------------------------------------------
  //
  // Em's new art (2026-08-16): a child's attic room with the sea and a
  // lighthouse out the arched window. Every position below is a thing she
  // actually drew, and each of her four functions has a piece of furniture:
  //
  //   貼紙       — the craft table on the left, covered in sticker sheets and
  //                a blank card frame
  //   我張卡     — the writing desk on the right, with the open book and the
  //                lit mirror
  //   好友冊     — the big clasped book on the floor cushion
  //   角色造型   — the wardrobe and the tall mirror, 「之後開放的新功能」
  "my-home": {
    id: "my-home",
    name: "我的小屋",
    art: "/assets/world/my-home.webp",
    artNight: "/assets/world/my-home-night.webp",
    back: { kind: "zone", target: "village-gate", side: "bottom" },
    spots: [
      { id: "update-card", label: "貼紙枱", x: 0.185, y: 0.470, kind: "panel", target: "update-card", hint: "整靚我張卡" },
      { id: "about-me", label: "我張卡", x: 0.740, y: 0.505, kind: "panel", target: "about-me", hint: "睇下寫咗啲乜" },
      { id: "friends", label: "我的好友冊", x: 0.195, y: 0.700, kind: "panel", target: "friends", hint: "見過邊個" },
      { id: "looks", label: "衣櫃同鏡", x: 0.850, y: 0.255, kind: "soon", target: "looks", hint: "換造型 · 未開放",
        note: "衣櫃入面掛住幾套仲未做好嘅衫。之後可以喺呢度換角色造型 —— 而家住住先。" },
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
