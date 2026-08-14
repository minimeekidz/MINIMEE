// Typed access to Em's pet spec workbook.
//
// `src/data/petBible.json` is generated from
// `docs/source/MINIMEE_寵物設定與VO規格_v1.xlsx` by
// `scripts/build_pet_bible.py`. **The workbook is the authority** — not this
// file, not the JSON, and not any string in a component.
//
// Nothing here invents content. Where the sheet supplies a line, that exact
// line is used; where it does not, the caller composes one from the pet's
// own 角色性格 / 說話語氣 / 固定口頭禪, which is why those fields are exposed
// rather than summarised. Hard-coding a pet's dialogue into a component is
// specifically what the spec's 09_ClaudeCode變更 sheet asks not to happen:
// the workbook has to stay the single place a line can be changed.

import bible from "../data/petBible.json";

type Row = Record<string, string>;

interface Section { notes: string[]; columns: string[]; rows: Row[] }

const section = (key: string): Section =>
  (bible as unknown as Record<string, Section>)[key] ?? { notes: [], columns: [], rows: [] };

// ---------------------------------------------------------------------------
// Pets
// ---------------------------------------------------------------------------

/**
 * The workbook's `MM_PET_01…12` against the ids the game already uses. The
 * order of `TOWN_PETS` in characters.ts matches the sheet, but pairing them by
 * position would break the moment either list is reordered, so the pairing is
 * written out.
 */
export const PET_SHEET_ID: Record<string, string> = {
  "sunshine-sheep": "MM_PET_01",
  "bao-hamster": "MM_PET_02",
  "milk-cat": "MM_PET_03",
  "watermelon-shiba": "MM_PET_04",
  "wave-penguin": "MM_PET_05",
  "aviator-chick": "MM_PET_06",
  "yarn-granny-mouse": "MM_PET_07",
  "heart-bunny": "MM_PET_08",
  "cowboy-pup": "MM_PET_09",
  "super-pig": "MM_PET_10",
  "spin-hedgehog": "MM_PET_11",
  "kimono-calico": "MM_PET_12",
};

const GAME_ID = Object.fromEntries(
  Object.entries(PET_SHEET_ID).map(([gameId, sheetId]) => [sheetId, gameId]),
);

export interface PetProfile {
  gameId: string;
  sheetId: string;
  nameZh: string;
  nameEn: string;
  species: string;
  /** MM-DD, parsed from the sheet's 「1月15日」 form. */
  birthday: string;
  zodiac: string;
  personality: string;
  tone: string;
  catchphrase: string;
  favouriteColours: string;
  favouriteActivities: string;
  favouriteFood: string;
  favouriteWeather: string;
  favouriteSeason: string;
  favouriteFestival: string;
  favouritePlace: string;
  favouritePet: string;
  giftLikes: string;
  motto: string;
  /** Every column from the sheet, for anything not surfaced above. */
  raw: Row;
}

function parseBirthday(text: string): string {
  const match = text.match(/(\d{1,2})\s*月\s*(\d{1,2})/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}

export const PET_PROFILES: PetProfile[] = section("pets").rows
  .filter(row => row.pet_id && GAME_ID[row.pet_id])
  .map(row => ({
    gameId: GAME_ID[row.pet_id],
    sheetId: row.pet_id,
    nameZh: row["名稱"] ?? "",
    nameEn: row["English"] ?? "",
    species: row["物種"] ?? "",
    birthday: parseBirthday(row["生日日期"] ?? ""),
    zodiac: row["星座"] ?? "",
    personality: row["角色性格"] ?? "",
    tone: row["說話語氣"] ?? "",
    catchphrase: row["固定口頭禪"] ?? "",
    favouriteColours: row["喜歡的顏色"] ?? "",
    favouriteActivities: row["喜歡活動"] ?? "",
    favouriteFood: row["喜歡的食物"] ?? "",
    favouriteWeather: row["喜歡的天氣"] ?? "",
    favouriteSeason: row["喜歡的季節"] ?? "",
    favouriteFestival: row["喜歡的節日"] ?? "",
    favouritePlace: row["最鍾意城鎮邊一個小地方"] ?? "",
    favouritePet: row["喜歡的小寵物"] ?? "",
    giftLikes: row["喜歡的禮物類別"] ?? "",
    motto: row["喜歡的名句及名人"] ?? "",
    raw: row,
  }));

const profileByGameId = new Map(PET_PROFILES.map(profile => [profile.gameId, profile]));

export function profileFor(gameId: string): PetProfile | null {
  return profileByGameId.get(gameId) ?? null;
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

export interface BibleLevel {
  level: number;
  title: string;
  needed: number;
  /** What newly becomes possible at this level, in Em's words. */
  unlocks: string;
  reward: string;
  gossip: string;
  intimacy: string;
}

export const BIBLE_LEVELS: BibleLevel[] = section("levels").rows
  .map(row => ({
    level: Number(row["等級"]),
    title: row["稱號"] ?? "",
    needed: Number(row["累積門檻"]),
    unlocks: row["新互動／關係變化"] ?? "",
    reward: row["神秘／固定獎勵"] ?? "",
    gossip: row["八卦／分享深度"] ?? "",
    intimacy: row["VO／動作親密度"] ?? "",
  }))
  .filter(level => Number.isFinite(level.level) && Number.isFinite(level.needed))
  .sort((a, b) => a.level - b.level);

// ---------------------------------------------------------------------------
// Quiz dialogue
// ---------------------------------------------------------------------------

/**
 * The six states the spec's answer machine can be in. The sheet names them in
 * Chinese; these are the keys the code uses.
 */
export type QuizState =
  | "asking"          // 提問
  | "firstWrong"      // 第一次答錯 — must NOT reveal the answer
  | "secondCorrect"   // 第二次答啱
  | "secondWrong"     // 第二次再錯
  | "firstCorrect"    // 第一次答啱
  | "correctNoBonus"; // 答啱但今日已 2 次成功

const STATE_FROM_SHEET: Record<string, QuizState> = {
  "提問": "asking",
  "第一次答錯": "firstWrong",
  "第二次答啱": "secondCorrect",
  "第二次再錯": "secondWrong",
  "第一次答啱": "firstCorrect",
  "答啱但今日已2次成功": "correctNoBonus",
};

export interface QuizLine { vo: string; tone: string; motion: string }

const quizLines = new Map<string, QuizLine>();
for (const row of section("quizVo").rows) {
  const gameId = GAME_ID[row.pet_id];
  const state = STATE_FROM_SHEET[row["狀態"] ?? ""];
  if (!gameId || !state) continue;
  quizLines.set(`${gameId}:${state}`, {
    vo: row["VO"] ?? "",
    tone: row["語氣"] ?? "",
    motion: row["動作建議"] ?? "",
  });
}

/**
 * The exact line this pet says in this state. `{主題}` is left in place for
 * the caller to fill — the sheet writes it that way, and substituting here
 * would hide from the caller that a topic name is required.
 */
export function quizLine(gameId: string, state: QuizState): QuizLine | null {
  return quizLines.get(`${gameId}:${state}`) ?? null;
}

// ---------------------------------------------------------------------------
// Event dialogue and behaviour
// ---------------------------------------------------------------------------

export interface EventVoRow { gameId: string; category: string; vo: string; raw: Row }

export const EVENT_VO: EventVoRow[] = section("eventVo").rows
  .filter(row => GAME_ID[row.pet_id])
  .map(row => ({
    gameId: GAME_ID[row.pet_id],
    category: row["事件類別"] ?? row["類別"] ?? "",
    vo: row["VO"] ?? "",
    raw: row,
  }));

/** Lines this pet has for a given event category, in the sheet's wording. */
export function eventVoFor(gameId: string, category: string): string[] {
  return EVENT_VO
    .filter(row => row.gameId === gameId && row.category.includes(category) && row.vo)
    .map(row => row.vo);
}

export interface SpawnRule {
  gameId: string;
  primary: string;
  secondary: string;
  hours: string;
  drizzle: string;
  storm: string;
  night: string;
  special: string;
}

export const SPAWN_RULES: SpawnRule[] = section("spawn").rows
  .filter(row => GAME_ID[row.pet_id])
  .map(row => ({
    gameId: GAME_ID[row.pet_id],
    primary: row["平日主出沒"] ?? "",
    secondary: row["第二出沒"] ?? "",
    hours: row["常見時段"] ?? "",
    drizzle: row["毛毛雨"] ?? "",
    storm: row["雷暴"] ?? "",
    night: row["夜間"] ?? "",
    special: row["特殊規則"] ?? "",
  }));

export function spawnFor(gameId: string): SpawnRule | null {
  return SPAWN_RULES.find(rule => rule.gameId === gameId) ?? null;
}

// ---------------------------------------------------------------------------
// The rest, exposed as-is for tooling and for the operator console
// ---------------------------------------------------------------------------

export const BIBLE_RULES = section("rules").rows;
export const BIBLE_REWARDS = section("rewards").rows;
export const BIBLE_EVENTS = section("events").rows;
export const BIBLE_PET_EVENT_PREFS = section("petEventPreferences").rows;
export const BIBLE_QA = section("qa").rows;
export const BIBLE_CODE_CHANGES = section("codeChanges").rows;
