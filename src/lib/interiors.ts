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

/**
 * A blank rectangle in the art that the app fills in.
 *
 * Em drew these on purpose — 「月度海報及影片畫面都已經保留可動態替換嘅框位」
 * — so the cinema's marquee, its three posters and both screens are painted
 * empty and the month's actual themes go into them. It is the difference
 * between a lobby that advertises this month and a lobby that is a picture of
 * a lobby.
 *
 * Rect is normalised over the art, same as a spot's position.
 */
export interface InteriorFrame {
  id: string;
  kind: "marquee" | "poster" | "screen" | "board";
  x: number; y: number; w: number; h: number;
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
  /** Blank rectangles in the art for the app to fill. */
  frames?: InteriorFrame[];
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
  //
  // Em's new art (2026-08-16), and the room is the junction of the whole
  // product: 「Hero Studio 最亦是一個主要的通道入口，因為由 Hero Studio 進去
  // 後，去右邊區是 MEE 圖書館，去左邊區是戲院大堂」.
  //
  // She painted the signs on, so the doors are not a guess: a film reel over
  // the left arch, an open book over the right, and a big star on the door
  // back out to 小鎮中心. The teaching board and the octagonal table in the
  // middle are the two things you come here to do — 「做當期學習主題的小遊戲、
  // 詞彙認讀學習等」 — one each, rather than one spot doing both.
  "studio": {
    id: "studio",
    name: "Hero Studio",
    art: "/assets/world/studio.webp",
    artNight: "/assets/world/studio-night.webp",
    back: { kind: "zone", target: "town-centre", side: "bottom" },
    spots: [
      { id: "current-words", label: "教學板", x: 0.505, y: 0.300, kind: "panel", target: "current-words", hint: "今期學嘅字" },
      { id: "theme-game", label: "小遊戲枱", x: 0.475, y: 0.545, kind: "panel", target: "theme-game", hint: "睇完片就嚟呢度" },
      { id: "to-cinema", label: "戲院大堂", x: 0.155, y: 0.320, kind: "room", target: "cinema-lobby", hint: "睇片" },
      { id: "to-library", label: "MEE 圖書館", x: 0.845, y: 0.320, kind: "room", target: "library", hint: "重溫舊詞語" },
      { id: "seat-red", label: "紅色圓凳", x: 0.278, y: 0.675, kind: "seat", target: "red",
        note: "紅色圓凳啱啱好望正塊教學板。個枱面暖暖地，好似有人啱啱先玩完。" },
      { id: "seat-blue", label: "藍色圓凳", x: 0.700, y: 0.675, kind: "seat", target: "blue",
        note: "坐呢邊望得到窗外嘅海同燈塔。日光斜斜咁照落地板。" },
    ],
    frames: [
      // The cream panel and the four small windows beside it. Blank in the
      // art on purpose — this month's words go here.
      { id: "board", kind: "board", x: 0.328, y: 0.268, w: 0.345, h: 0.068 },
    ],
  },

  // --- MEE 圖書館 -----------------------------------------------------------
  // 「重溫過去主題字詞的地方，小童圖書區、小布偶椅子、卡通豆袋沙發、舒適安靜
  // 的環境」. The long table with the blank card frames is the reading desk;
  // everything soft in the room can be sat on.
  "library": {
    id: "library",
    name: "MEE 圖書館",
    art: "/assets/world/library.webp",
    artNight: "/assets/world/library-night.webp",
    back: { kind: "room", target: "studio", side: "bottom" },
    spots: [
      { id: "past-words", label: "重溫枱", x: 0.500, y: 0.500, kind: "panel", target: "past-words", hint: "由頭睇返" },
      { id: "seat-doll", label: "小布偶椅", x: 0.385, y: 0.625, kind: "seat", target: "doll",
        note: "花花形嘅小椅仔，啱啱好夠你一個人坐。成間圖書館靜到聽到自己揭書。" },
      { id: "seat-bean", label: "豆袋沙發", x: 0.125, y: 0.735, kind: "seat", target: "bean",
        note: "成個人陷入豆袋度，郁一郁就沙沙聲。舉高本書就唔想放低。" },
      { id: "seat-reading", label: "小童圖書區", x: 0.310, y: 0.390, kind: "seat", target: "reading",
        note: "地台上面鋪滿軟墊，成排書就喺你頭頂。呢個角落嘅陽光最好。" },
    ],
    frames: [
      { id: "board", kind: "board", x: 0.778, y: 0.188, w: 0.190, h: 0.095 },
    ],
  },

  // --- 戲院大堂 -------------------------------------------------------------
  //
  // 「戲院海報顯示當月主題的學習主題影片海報（3張），接待處（購買戲飛）是選擇
  // 影片的地方，無論是當月影片／過去的影片，所有影片都會在這邊選擇播放」.
  //
  // Two auditoriums lead off the right-hand wall: 1 號廳 plays the month's
  // themes, 2 號廳 the ones already finished. That split is the reason the
  // lobby lists both — a child who wants to watch something again should not
  // have to pretend they have not finished it.
  "cinema-lobby": {
    id: "cinema-lobby",
    name: "戲院大堂",
    art: "/assets/world/cinema-lobby.webp",
    back: { kind: "room", target: "studio", side: "bottom" },
    spots: [
      { id: "tickets", label: "接待處", x: 0.365, y: 0.378, kind: "panel", target: "tickets", hint: "同職員揀套片" },
      { id: "to-hall", label: "1 號廳", x: 0.685, y: 0.320, kind: "room", target: "cinema-hall", hint: "當期影片" },
      { id: "to-hall-2", label: "2 號廳", x: 0.870, y: 0.320, kind: "room", target: "cinema-hall-2", hint: "重溫舊片" },
      { id: "snacks", label: "小食部", x: 0.800, y: 0.560, kind: "treat", target: "snacks", hint: "爆谷同飲品" },
      { id: "seat-red", label: "紅色梳化", x: 0.185, y: 0.700, kind: "seat", target: "red",
        note: "紅絲絨梳化好深，坐入去成個人陷咗落去。等開場最啱坐呢張。" },
      { id: "seat-blue", label: "藍色梳化", x: 0.625, y: 0.725, kind: "seat", target: "blue",
        note: "望住入場門嗰邊。有人行過都見到，好似真係喺戲院等緊入場咁。" },
    ],
    frames: [
      { id: "marquee", kind: "marquee", x: 0.160, y: 0.140, w: 0.410, h: 0.042 },
      { id: "poster-1", kind: "poster", x: 0.207, y: 0.203, w: 0.100, h: 0.150 },
      { id: "poster-2", kind: "poster", x: 0.317, y: 0.203, w: 0.103, h: 0.150 },
      { id: "poster-3", kind: "poster", x: 0.437, y: 0.203, w: 0.103, h: 0.150 },
    ],
  },

  // --- 戲院 1 號廳 ----------------------------------------------------------
  // 「播放當期主題影片」.
  "cinema-hall": {
    id: "cinema-hall",
    name: "戲院 1 號廳",
    art: "/assets/world/cinema-hall.webp",
    back: { kind: "room", target: "cinema-lobby", side: "bottom" },
    frames: [
      { id: "screen", kind: "screen", x: 0.245, y: 0.117, w: 0.512, h: 0.298 },
    ],
    spots: [
      { id: "screen", label: "銀幕", x: 0.500, y: 0.265, kind: "panel", target: "screen", hint: "睇片" },
      { id: "seat-sofa", label: "後排梳化", x: 0.115, y: 0.800, kind: "seat", target: "sofa",
        note: "後排靠牆嗰張梳化，攬枕堆到成堆。成間廳得你一個，慢慢揀位。" },
    ],
  },

  // --- 戲院 2 號廳 ----------------------------------------------------------
  // 「播放過往主題影片」. Same room, cooler light, and the point of it is that
  // a finished theme stays watchable — a child who wants a film again should
  // not have to pretend they have not finished it.
  "cinema-hall-2": {
    id: "cinema-hall-2",
    name: "戲院 2 號廳",
    art: "/assets/world/cinema-hall-2.webp",
    back: { kind: "room", target: "cinema-lobby", side: "bottom" },
    frames: [
      { id: "screen", kind: "screen", x: 0.240, y: 0.170, w: 0.518, h: 0.230 },
    ],
    spots: [
      { id: "screen", label: "銀幕", x: 0.500, y: 0.285, kind: "panel", target: "screen", hint: "重溫舊片" },
      { id: "seat-left", label: "左邊梳化", x: 0.140, y: 0.655, kind: "seat", target: "left",
        note: "紫色梳化，坐低就望正塊幕。天花嘅星星喺暗位度一閃一閃。" },
      { id: "seat-right", label: "右邊梳化", x: 0.860, y: 0.655, kind: "seat", target: "right",
        note: "呢邊有個位擺飲品。坐低之後成間廳靜咗落嚟。" },
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
