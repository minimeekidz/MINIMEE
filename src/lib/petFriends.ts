// 好感度 — what the child can do with a pet, and what it takes to unlock it.
//
// The shape Em asked for: a few plain greetings at the start, and the warmer
// things — hugging, sharing how you feel, being told secrets, being given a
// card — earned over time. Two rules keep that honest:
//
// 1. **Each level costs more than the last.** A flat curve would have a child
//    at the top of every pet within a week and nothing left to come back for.
// 2. **Every action has a daily cap.** Without one the fastest route to best
//    friends is tapping 打招呼 two hundred times, which teaches nothing and
//    makes the number meaningless. The cap is enforced in the database, not
//    just hidden in the UI.
//
// The point of the whole thing is the daily word share: it is worth far more
// than any greeting, so friendship tracks what the child has actually learnt.

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
  points: number;
  /** How many times a day this may be done with one pet. */
  perDay: number;
  /** What the pet does back, shown in its bubble. */
  reply: string[];
}

export const PET_ACTIONS: PetAction[] = [
  { id: "greet", label: "打招呼", icon: "👋", level: 1, points: 2, perDay: 1,
    reply: ["早晨呀！", "你返嚟啦！", "今日好天氣喎～"] },
  { id: "chat", label: "傾下計", icon: "💬", level: 1, points: 3, perDay: 2,
    reply: ["我啱啱喺公園見到隻好肥嘅雀仔！", "你估我今朝食咗咩？", "呢度嘅花開晒喇。"] },
  { id: "wave", label: "揮手", icon: "🙌", level: 1, points: 2, perDay: 2,
    reply: ["嘻嘻！", "揮返俾你～", "我見到你喇！"] },

  { id: "share-activity", label: "分享活動", icon: "🎏", level: 2, points: 5, perDay: 1,
    reply: ["聽落好好玩喎！", "下次帶埋我去啦～", "哇，我都想試！"] },
  { id: "jump", label: "一齊跳", icon: "⭐", level: 2, points: 4, perDay: 2,
    reply: ["跳高啲！", "哈哈哈，好好玩！", "我跳得仲高呀！"] },

  { id: "hug", label: "攬一攬", icon: "🤗", level: 3, points: 6, perDay: 1,
    reply: ["暖笠笠～", "多謝你呀。", "我今日開心咗好多。"] },
  { id: "share-likes", label: "講下鍾意咩", icon: "💗", level: 3, points: 6, perDay: 1,
    reply: ["我都鍾意呀！", "原來我哋咁夾嘅。", "記住咗喇！"] },

  { id: "share-feelings", label: "講下心情", icon: "🌈", level: 4, points: 8, perDay: 1,
    reply: ["唔開心可以話我知㗎。", "我喺度陪住你。", "聽你講完我都開心。"] },
  { id: "gift", label: "送小禮物", icon: "🎁", level: 4, points: 8, perDay: 1,
    reply: ["俾我㗎？多謝！", "我會好好收埋佢。", "哇……我好鍾意。"] },

  { id: "gossip", label: "聽小秘密", icon: "🤫", level: 5, points: 10, perDay: 1,
    reply: ["咪話俾人聽呀…", "得你一個知㗎咋。", "噓——過嚟啲。"] },

  { id: "card-normal", label: "收下佢送嘅 MEE 卡", icon: "🃏", level: 6, points: 12, perDay: 1,
    reply: ["呢張送俾你！", "我覺得你會鍾意呢張。", "留住佢啦～"] },

  { id: "best-friend", label: "最好嘅朋友", icon: "💖", level: 7, points: 14, perDay: 1,
    reply: ["你係我最好嘅朋友。", "永遠都係好朋友呀！", "有你真好。"] },

  { id: "card-flash", label: "收下閃卡", icon: "✨", level: 8, points: 18, perDay: 1,
    reply: ["呢張好罕有㗎！", "閃閃哋，好靚呀！", "淨係送俾最好嘅朋友。"] },
];

export interface FriendLevel {
  level: number;
  title: string;
  /** Total points needed to reach this level. */
  needed: number;
}

// Each step costs noticeably more than the one before, so the last levels are
// something to come back for across a subscription rather than a first week.
export const FRIEND_LEVELS: FriendLevel[] = [
  { level: 1, title: "啱啱識",    needed: 0 },
  { level: 2, title: "識少少",    needed: 20 },
  { level: 3, title: "熟絡咗",    needed: 55 },
  { level: 4, title: "好朋友",    needed: 115 },
  { level: 5, title: "老友記",    needed: 215 },
  { level: 6, title: "好夾",      needed: 370 },
  { level: 7, title: "無所不談",  needed: 600 },
  { level: 8, title: "最好嘅朋友", needed: 920 },
];

export const MAX_LEVEL = FRIEND_LEVELS[FRIEND_LEVELS.length - 1].level;

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

/** The next thing that unlocks, so the panel can say what it is worth. */
export function nextUnlock(level: number): PetAction | null {
  return PET_ACTIONS.find(action => action.level === level + 1) ?? null;
}

/**
 * What a pet is thinking about, shown in a bubble over its head — the Sims
 * "wish" Em asked for. Purely decoration: it is what makes the town look
 * inhabited rather than populated by props, and costs nothing to add to.
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

/**
 * Points for the daily word question, and for getting there after the pet
 * had to show the answer.
 *
 * Set above every other action on purpose: answering is the single most
 * valuable thing the child can do with a pet, so 好感度 measures what they
 * have learnt rather than how many times they tapped 打招呼. A test asserts
 * the ordering, because it is the kind of thing a later tweak quietly breaks.
 *
 * Getting there after a hint still pays. A five-year-old who loses everything
 * for one wrong guess stops guessing, which is the opposite of the point.
 */
export const QUIZ_POINTS = { correct: 20, afterHint: 8 } as const;

/** How many word questions one pet asks per day. */
export const QUIZ_PER_DAY = 1;

export function pickReply(action: PetAction, seed = Math.random()): string {
  return action.reply[Math.floor(seed * action.reply.length) % action.reply.length];
}

/**
 * Local date key. Daily caps are the child's own day, not UTC — a cap that
 * rolls over at 8am Hong Kong time would be indefensible to a parent.
 */
export function today(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
