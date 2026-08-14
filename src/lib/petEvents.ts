// What makes today different from yesterday.
//
// The friendship numbers are deliberately tiny — one or two points a day —
// so what keeps a child coming back cannot be the number. It has to be that
// the pet has something new to say. Repetition is the real churn risk here,
// not pacing: the same greeting for thirty days running is what makes a child
// stop, and no curve tuning fixes that.
//
// Everything here is derived from the date rather than stored, so it needs no
// scheduling, no cron and no operator action — a festival simply arrives.
//
// NOT included: weather. There is no weather source in the app, and inventing
// one would have a pet say 落雨啦 on a clear day, which a child in Hong Kong
// would notice immediately. It needs a real feed before it can be honest.

export type PetEventKind =
  | "season" | "festival" | "child-birthday" | "pet-birthday"
  | "town-event" | "new-theme";

export interface PetEvent {
  kind: PetEventKind;
  /** Short label for the pet's bubble or a banner. */
  label: string;
  icon: string;
  /** Extra dialogue mixed into whatever the child taps today. */
  lines: string[];
}

/** Hong Kong seasons, roughly, since the art changes with them. */
function seasonOf(date: Date): PetEvent {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) {
    return { kind: "season", label: "春天", icon: "🌸",
      lines: ["啲花開晒喇，好靚呀！", "春天啦，出面暖笠笠。", "我見到有雀仔搭緊竇喎。"] };
  }
  if (month >= 6 && month <= 8) {
    return { kind: "season", label: "夏天", icon: "🌞",
      lines: ["好熱呀…想食雪糕。", "夏天！去唔去玩水？", "今日隻蟬叫得好大聲。"] };
  }
  if (month >= 9 && month <= 11) {
    return { kind: "season", label: "秋天", icon: "🍂",
      lines: ["啲葉變黃晒喇。", "秋天最舒服，唔凍唔熱。", "夜晚開始早咗黑喎。"] };
  }
  return { kind: "season", label: "冬天", icon: "❄️",
    lines: ["好凍呀，攬實我啦！", "冬天要著多件衫㗎。", "我隻手凍冰冰。"] };
}

/**
 * Fixed-date festivals only. The lunar ones (農曆新年, 中秋) move every year
 * and would need a calendar table — worth adding, but a wrong date is worse
 * than no greeting, so they are left out until the dates are supplied.
 */
const FIXED_FESTIVALS: Record<string, { label: string; icon: string; lines: string[] }> = {
  "01-01": { label: "元旦", icon: "🎉", lines: ["新年快樂！今年一齊努力呀！", "新一年喇，你想做啲咩？"] },
  "10-31": { label: "萬聖節", icon: "🎃", lines: ["Trick or treat！", "今晚會唔會有鬼呀…我有啲驚。"] },
  "12-24": { label: "平安夜", icon: "🎄", lines: ["聖誕快樂呀！", "我掛咗襪喺度，唔知有冇禮物呢？"] },
  "12-25": { label: "聖誕節", icon: "🎁", lines: ["聖誕快樂！", "你收到咩禮物呀？"] },
};

/** Each pet's birthday, spread through the year so one lands most months. */
export const PET_BIRTHDAYS: Record<string, string> = {
  "sunshine-sheep": "01-15",
  "bao-hamster": "02-12",
  "milk-cat": "03-08",
  "watermelon-shiba": "04-20",
  "wave-penguin": "05-11",
  "aviator-chick": "06-06",
  "yarn-granny-mouse": "07-19",
  "heart-bunny": "08-14",
  "cowboy-pup": "09-23",
  "super-pig": "10-09",
  "spin-hedgehog": "11-17",
  "kimono-calico": "12-05",
};

function monthDay(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export interface EventContext {
  petId: string;
  /** The child's birthday as MM-DD, if the parent has given one. */
  childBirthday?: string | null;
  /** True on the day a new theme opens, so the pets can mention it. */
  newThemeToday?: boolean;
  now?: Date;
}

/**
 * Everything happening today for this pet, most personal first — a birthday
 * should outrank the season in whatever the pet says.
 */
export function eventsFor({ petId, childBirthday, newThemeToday, now = new Date() }: EventContext): PetEvent[] {
  const events: PetEvent[] = [];
  const key = monthDay(now);

  if (childBirthday && childBirthday === key) {
    events.push({ kind: "child-birthday", label: "你生日", icon: "🎂",
      lines: ["生日快樂呀！！", "今日係你大日子，我特登等你嚟！", "我唱首歌俾你聽好唔好？"] });
  }

  if (PET_BIRTHDAYS[petId] === key) {
    events.push({ kind: "pet-birthday", label: "佢生日", icon: "🎈",
      lines: ["今日係我生日呀！", "你係第一個嚟同我講嘢嘅人！", "我好開心你今日搵我～"] });
  }

  if (newThemeToday) {
    events.push({ kind: "new-theme", label: "新主題", icon: "📺",
      lines: ["聽講有新嘢學喎，你去咗睇未？", "我好想知今次學咩！", "學完記得返嚟講俾我聽呀。"] });
  }

  const festival = FIXED_FESTIVALS[key];
  if (festival) events.push({ kind: "festival", ...festival });

  // The 1st and 15th are town days — something small and regular, so a quiet
  // month still has a couple of days that feel different.
  if (now.getDate() === 1 || now.getDate() === 15) {
    events.push({ kind: "town-event", label: "小鎮日", icon: "🎪",
      lines: ["今日小鎮好熱鬧喎！", "廣場嗰邊好似有嘢玩。", "你有冇聽到啲音樂？"] });
  }

  events.push(seasonOf(now));
  return events;
}

/** The dialogue lines today's events contribute. */
export function eventLines(context: EventContext): string[] {
  return eventsFor(context).flatMap(event => event.lines);
}

/** The one event worth putting on a badge, if any is more notable than the season. */
export function headlineEvent(context: EventContext): PetEvent | null {
  const events = eventsFor(context);
  const notable = events.find(event => event.kind !== "season");
  return notable ?? null;
}
