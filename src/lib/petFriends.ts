// 好感度 — how a friendship with one town pet grows.
//
// The scoring is deliberately tiny and deliberately not per-action:
//
//   • **Visiting a pet at all earns 1 point, once a day.** Not one point per
//     action. Pressing every button was homework — a child would work through
//     the list to farm the number instead of doing the things they actually
//     felt like. Now the actions are free and unlimited, and a child taps
//     攬一攬 ten times because they want to, not because it pays.
//   • **Answering that pet's word question earns 1 more** — but only for the
//     first two pets a day, across the whole town. That scarcity is the
//     point: with twelve pets and two slots, a child has to choose who they
//     are actually building a friendship with rather than spreading thin.
//   • **A wrong answer costs nothing.** Two tries; miss both and the pet says
//     try again tomorrow — and the daily slot is *not* spent, so the child
//     can go and find another friend. Losing a chance for guessing is how you
//     teach a five-year-old to stop guessing.
//
// So a day is worth at most 14 points across all twelve pets, and any one
// friendship moves 1–2 points a day. Levels are a flat 30 points apart:
// 15 days a level for a pet you quiz daily, 30 for one you only visit.
//
// Repetition is handled by events (src/lib/petEvents.ts), not by bigger
// numbers — the same greeting every day for a month is what actually makes a
// child stop, and no amount of curve tuning fixes it.

export type PetActionId =
  | "greet" | "chat" | "wave"
  | "share-activity" | "jump"
  | "hug" | "share-likes"
  | "share-feelings" | "gift"
  | "gossip"
  | "card-normal"
  | "best-friend"
  | "card-flash";

export interface PetAction {
  id: PetActionId;
  label: string;
  /** Emoji stand-in so an action reads before a child can read. */
  icon: string;
  /** Friendship level this becomes available at. */
  level: number;
  /** What the pet does back. Events add more lines on top of these. */
  reply: string[];
}

// No points and no daily limit on any of these: the first interaction of the
// day is what scores, whichever one it happens to be.
export const PET_ACTIONS: PetAction[] = [
  { id: "greet", label: "打招呼", icon: "👋", level: 1,
    reply: ["早晨呀！", "你返嚟啦！", "今日好天氣喎～", "我等咗你好耐喇！"] },
  { id: "chat", label: "傾下計", icon: "💬", level: 1,
    reply: ["我啱啱喺公園見到隻好肥嘅雀仔！", "你估我今朝食咗咩？", "呢度嘅花開晒喇。", "琴日我發咗個好得意嘅夢。"] },
  { id: "wave", label: "揮手", icon: "🙌", level: 1,
    reply: ["嘻嘻！", "揮返俾你～", "我見到你喇！", "喂——！"] },

  { id: "share-activity", label: "分享活動", icon: "🎏", level: 2,
    reply: ["聽落好好玩喎！", "下次帶埋我去啦～", "哇，我都想試！", "你做咩都咁叻嘅。"] },
  { id: "jump", label: "一齊跳", icon: "⭐", level: 2,
    reply: ["跳高啲！", "哈哈哈，好好玩！", "我跳得仲高呀！", "再嚟多次！"] },

  { id: "hug", label: "攬一攬", icon: "🤗", level: 3,
    reply: ["暖笠笠～", "多謝你呀。", "我今日開心咗好多。", "你好香喎。"] },
  { id: "share-likes", label: "講下鍾意咩", icon: "💗", level: 3,
    reply: ["我都鍾意呀！", "原來我哋咁夾嘅。", "記住咗喇！", "下次我搵埋俾你。"] },

  { id: "share-feelings", label: "講下心情", icon: "🌈", level: 4,
    reply: ["唔開心可以話我知㗎。", "我喺度陪住你。", "聽你講完我都開心。", "你今日笑得好靚。"] },
  { id: "gift", label: "送小禮物", icon: "🎁", level: 4,
    reply: ["俾我㗎？多謝！", "我會好好收埋佢。", "哇……我好鍾意。", "我都有嘢想俾你！"] },

  { id: "gossip", label: "聽小秘密", icon: "🤫", level: 6,
    reply: ["咪話俾人聽呀…", "得你一個知㗎咋。", "噓——過嚟啲。", "呢件事我淨係同你講。"] },

  { id: "card-normal", label: "收下佢送嘅 MEE 卡", icon: "🃏", level: 8,
    reply: ["呢張送俾你！", "我覺得你會鍾意呢張。", "留住佢啦～"] },

  { id: "best-friend", label: "最好嘅朋友", icon: "💖", level: 10,
    reply: ["你係我最好嘅朋友。", "永遠都係好朋友呀！", "有你真好。"] },

  { id: "card-flash", label: "收下閃卡", icon: "✨", level: 12,
    reply: ["呢張好罕有㗎！", "閃閃哋，好靚呀！", "淨係送俾最好嘅朋友。"] },
];

export interface FriendLevel {
  level: number;
  title: string;
  needed: number;
  /** Levels with no new action are where a surprise reward lands instead. */
  surprise: boolean;
}

/** Points between one level and the next. Flat all the way up. */
export const LEVEL_STEP = 30;

/** Provisional titles — Em is still deciding the final twelve. */
const LEVEL_TITLES = [
  "啱啱識", "識少少", "熟絡咗", "有默契", "講得埋", "好朋友",
  "老友記", "好夾", "識晒你脾氣", "無所不談", "心照", "最好嘅朋友",
];

export const FRIEND_LEVELS: FriendLevel[] = LEVEL_TITLES.map((title, index) => {
  const level = index + 1;
  return {
    level,
    title,
    needed: index * LEVEL_STEP,
    // Levels that unlock nothing new are the ones that carry a surprise, so
    // no level is a dead step.
    surprise: !PET_ACTIONS.some(action => action.level === level),
  };
});

export const MAX_LEVEL = FRIEND_LEVELS[FRIEND_LEVELS.length - 1].level;

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Earned once a day per pet, for turning up at all. */
export const VISIT_POINT = 1;
/** Earned for answering that pet's question, within the daily slots. */
export const QUIZ_POINT = 1;
/** How many pets a day can pay out for a correct answer, across the town. */
export const DAILY_QUIZ_SLOTS = 2;
/** Tries at one pet's question before it gives the answer away. */
export const QUIZ_TRIES = 2;

export function levelFor(points: number): FriendLevel {
  let current = FRIEND_LEVELS[0];
  for (const step of FRIEND_LEVELS) if (points >= step.needed) current = step;
  return current;
}

/** Points still to go, and how far through the current level we are. */
export function levelProgress(points: number): { level: FriendLevel; next: FriendLevel | null; toGo: number; fraction: number } {
  const level = levelFor(points);
  const next = FRIEND_LEVELS.find(step => step.level === level.level + 1) ?? null;
  if (!next) return { level, next, toGo: 0, fraction: 1 };
  const span = next.needed - level.needed;
  return {
    level, next,
    toGo: next.needed - points,
    fraction: span <= 0 ? 1 : Math.min(1, Math.max(0, (points - level.needed) / span)),
  };
}

export function actionsAt(level: number): PetAction[] {
  return PET_ACTIONS.filter(action => action.level <= level);
}

/** The next thing that unlocks, so the panel can say what is coming. */
export function nextUnlock(level: number): PetAction | null {
  return PET_ACTIONS.find(action => action.level > level) ?? null;
}

/**
 * What a pet is thinking about, shown in a bubble over its head — the Sims
 * "wish" Em asked for. Pure decoration, and the cheapest thing on screen that
 * makes the town look inhabited.
 */
export const PET_WISHES: string[] = [
  "🍰 好想食件蛋糕…", "☀️ 今日出太陽喇！", "💤 想瞓一陣…",
  "🎵 我諗緊首歌", "🌸 啲花好靚呀", "🐟 唔知有冇魚食呢？",
  "📚 想搵人講故事", "⚽ 邊個同我玩波？", "🎨 好想畫嘢",
  "🧦 我隻襪唔見咗…", "🌈 落完雨會唔會有彩虹？", "🎂 今日係咪有人生日？",
  "🚀 我想飛上天", "🍜 好肚餓呀…", "💌 想收信",
  "🫧 想去游水", "⭐ 今晚睇唔睇到星？", "🧸 我個公仔喺邊？",
];

/** How long one wish sits in the bubble before the pet thinks of another. */
export const WISH_MS = 14000;

export function pickReply(action: PetAction, extra: string[] = [], seed = Math.random()): string {
  // Event lines are mixed in with the pet's ordinary ones rather than
  // replacing them, so a festival feels like a good day rather than a
  // different character.
  const lines = [...extra, ...action.reply];
  return lines[Math.floor(seed * lines.length) % lines.length];
}

/**
 * Local date key. Daily limits are the child's own day, not UTC — one that
 * rolled over at 8am Hong Kong time would be indefensible to a parent.
 */
export function today(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
