// The seven ways a theme gets played.
//
// Three rules shaped this file, all of them Em's:
//
//  1. 「每個月轉換更新嘅時候，就順便換埋個遊戲玩法，咁先唔會咁悶」— the game
//     belongs to the release, not to the theme. Same theme, new month, new
//     game.
//  2. 「如果三個主題嘅學習影片都係同一個遊戲玩法，咁就好沉悶」— the cinema
//     screens three themes at once, so the three must be three different
//     games. The database refuses to store two the same (partial unique
//     index on theme_releases); this file only has to make seven that are
//     genuinely different, not seven skins of pick-one-of-four.
//  3. 「呢個遊戲一定會諗到除咗有趣味之外仲係重複玩都會感覺會良好」— it is
//     played four times, once per fragment, and children will replay it.
//
// Rule 3 is the hard one, and it is why every mode below escalates across
// its four rounds instead of repeating. Round 1 recognises, round 4 produces.
// A child who replays a finished theme gets a different draw, because the
// content is generated from a seed rather than authored four times: same
// shape, new specifics, which is what makes a fourth play still feel like
// playing rather than like re-reading.
//
// Everything here is derived from data that already exists — the theme's
// four words, its VO paragraph, its question and its answer pattern. Nothing
// waits on artwork. Where artwork will make a mode better (搵一搵, 跟住做,
// 砌一砌), the mode still runs without it and the art is listed in
// docs/design-reference/theme-game-plan.md as something to add, not as
// something that blocks the build.

/** The four plays that make one card, one per fragment. */
export const ROUNDS_PER_THEME = 4;

export type GameMode =
  | "sentence" | "number" | "spot" | "predict" | "choice" | "move" | "make";

export const GAME_MODES: GameMode[] = [
  "sentence", "number", "spot", "predict", "choice", "move", "make",
];

export interface GameFamily {
  id: GameMode;
  /** What a child sees it called. */
  nameZh: string;
  /** 學習範疇 — Em: 「三個主題嘅學習影片可以係三個學習」. */
  domain: string;
  /** One line, for the back office, on what the child actually does. */
  doing: string;
  /** How the four rounds escalate, round 1 to round 4. */
  ladder: [string, string, string, string];
  /** True when the mode has no wrong answer and nothing to score. */
  openEnded: boolean;
}

export const FAMILIES: Record<GameMode, GameFamily> = {
  sentence: {
    id: "sentence", nameZh: "講句子", domain: "中文・語文表達",
    doing: "由旁白句子填返個詞，再砌返成句完整說話。",
    ladder: [
      "旁白句子留空一個詞，喺選項度揀返佢",
      "同上，但選項多咗，冇咗圖示提示",
      "揀返正確嘅句式同詞語，砌成一句完整說話",
      "自己講／打返成句（細路仔就繼續砌）",
    ],
    openEnded: false,
  },
  number: {
    id: "number", nameZh: "數一數", domain: "數學・數量同比較",
    doing: "數主題入面嘅嘢有幾多件，再比較同加減。",
    ladder: [
      "數一種嘢有幾多件",
      "兩種嘢邊樣多啲",
      "兩種加埋一共幾多",
      "多咗／少咗幾多（應用題）",
    ],
    openEnded: false,
  },
  spot: {
    id: "spot", nameZh: "搵一搵", domain: "探索・觀察力",
    doing: "喺一堆嘢入面搵指定嗰件，最後仲要搵出唔屬於呢個主題嘅一件。",
    ladder: [
      "喺格仔入面搵出指定嗰個詞",
      "格仔多咗，再搵一次",
      "搵出唔屬於呢個主題嘅嗰個",
      "先睇一眼，格仔冚埋，憑記憶搵返",
    ],
    openEnded: false,
  },
  predict: {
    id: "predict", nameZh: "估下會點", domain: "大自然與科學・推理",
    doing: "旁白講到一半停低，估下跟住講緊邊一樣。",
    ladder: [
      "旁白停喺個詞前一刻，估下係邊個",
      "停早半句",
      "停早成句，要靠上文推理",
      "淨係聽開頭，估埋成段仲會講邊幾樣",
    ],
    openEnded: false,
  },
  choice: {
    id: "choice", nameZh: "你會點揀", domain: "品德與情緒・自我表達",
    doing: "答主題嗰條問題，冇啱冇錯，答案會留喺自己張卡度。",
    ladder: [
      "揀一個答案，砌成一句說話",
      "揀完再揀點解",
      "揀完自己講／打返個原因",
      "估下屋企人會揀邊個，再對一對",
    ],
    openEnded: true,
  },
  move: {
    id: "move", nameZh: "跟住做", domain: "體能・身體協調",
    doing: "跟住寵物做動作，一次比一次多，做完自己撳完成。",
    ladder: [
      "跟住做一個動作",
      "記住兩個動作嘅次序",
      "三個動作",
      "四個動作，一次過做晒",
    ],
    openEnded: true,
  },
  make: {
    id: "make", nameZh: "砌一砌", domain: "美藝・創作",
    doing: "用貼紙砌返個主題場景，砌完會擺返自己間房。",
    ladder: [
      "擺一件嘢入去",
      "擺兩件",
      "擺三件，仲要揀個背景",
      "自由砌，最後幫幅作品改個名",
    ],
    openEnded: true,
  },
};

// ---------------------------------------------------------------------------
// Difficulty
// ---------------------------------------------------------------------------

export type AgeBand = "3-5" | "6-8" | "9-12";

export interface Difficulty {
  band: AgeBand;
  /** Tap targets on screen. Never more than four for the youngest. */
  options: number;
  /** Show the picture / first-character cue. */
  hints: boolean;
  /** Answer by typing instead of tapping. */
  typing: boolean;
  /**
   * Soft timer in seconds, or null for untimed. Running out never costs the
   * fragment — it only costs the star. A timer that could take away the
   * reward would turn the one thing the child is here for into a punishment.
   */
  seconds: number | null;
}

/**
 * The band for a derived age, or for the age group a family picked at sign-up.
 *
 * Both are accepted because both exist: a child with a date of birth gets a
 * real age, and one who signed up before `children.dob` existed has only the
 * band their parent chose. Taking the group directly is better than guessing
 * a number out of it and then bucketing the guess.
 *
 * An unknown age lands in the middle band, never the oldest: the worst
 * outcome is asking a five-year-old to type, so the default is the one that
 * never types.
 */
export function bandFor(age: number | AgeBand | "13+" | null | undefined): AgeBand {
  if (age === null || age === undefined) return "6-8";
  if (typeof age === "string") {
    // 13+ has no band of its own — the hardest one we have is the one it gets.
    return age === "13+" ? "9-12" : age;
  }
  if (Number.isNaN(age)) return "6-8";
  if (age <= 5) return "3-5";
  if (age <= 8) return "6-8";
  return "9-12";
}

const OPTIONS_BY_BAND: Record<AgeBand, [number, number, number, number]> = {
  "3-5": [2, 2, 3, 3],
  "6-8": [3, 3, 4, 4],
  "9-12": [4, 4, 4, 4],
};

const SECONDS_BY_BAND: Record<AgeBand, Array<number | null>> = {
  // Nothing timed for the youngest, at any round.
  "3-5": [null, null, null, null],
  "6-8": [null, null, null, 60],
  "9-12": [null, null, 45, 45],
};

export function difficultyFor(
  age: number | AgeBand | "13+" | null | undefined, round: number,
): Difficulty {
  const band = bandFor(age);
  const index = Math.min(Math.max(round, 1), ROUNDS_PER_THEME) - 1;
  return {
    band,
    options: OPTIONS_BY_BAND[band][index],
    // Hints fade as the rounds go up, and fade sooner the older the child.
    hints: band === "3-5" ? true : band === "6-8" ? index < 2 : index < 1,
    // Typing is the oldest band's last round only.
    typing: band === "9-12" && index === ROUNDS_PER_THEME - 1,
    seconds: SECONDS_BY_BAND[band][index],
  };
}

// ---------------------------------------------------------------------------
// A round
// ---------------------------------------------------------------------------

export type RoundInput = "tap" | "type" | "order" | "do" | "free";

export interface Round {
  round: number;
  mode: GameMode;
  /** What is asked, in the child's words. */
  prompt: string;
  /** The theme word this round is about — what the sticker/VO should show. */
  word: string;
  /** Tap targets. Empty for the open-ended modes. */
  options: string[];
  /**
   * The right answer, or "" when there is no right answer. An empty string
   * is the signal to the UI that nothing may be marked wrong.
   */
  answer: string;
  input: RoundInput;
  hint: string | null;
  difficulty: Difficulty;
}

export interface ThemeGameSource {
  themeId: string;
  nameZh: string;
  words: string[];
  vo: string;
  question: string;
  answerPattern: string;
  mode: GameMode;
}

export interface BuildOptions {
  age?: number | AgeBand | "13+" | null;
  /**
   * Words from the other themes on the wall. Used for the odd-one-out round
   * and for distractors once four options are needed but the theme only has
   * four words in total.
   */
  foreignWords?: string[];
  /**
   * Changes the draw without changing the shape. The play count goes here,
   * so a replay is a new set of numbers and a new order rather than the
   * identical four screens.
   */
  salt?: number;
}

// ---------------------------------------------------------------------------
// Seeded randomness
// ---------------------------------------------------------------------------

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** mulberry32 — small, fast, and the same sequence in a test as in a browser. */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], next: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function pick(count: number, next: () => number, low = 1): number {
  return low + Math.floor(next() * count);
}

// ---------------------------------------------------------------------------
// Reading the VO
// ---------------------------------------------------------------------------

/**
 * The VO paragraph split into clauses.
 *
 * The punctuation is kept on the clause it ends, because a clause shown to a
 * child without its comma reads like a fragment rather than like the sentence
 * they just heard.
 */
export function clausesOf(vo: string): string[] {
  const parts = vo.match(/[^。，；！？]+[。，；！？]?/g) ?? [];
  return parts.map(part => part.trim()).filter(Boolean);
}

/** The clause that introduces a word, which is the one the VO explains it in. */
export function clauseFor(vo: string, word: string): string | null {
  return clausesOf(vo).find(clause => clause.includes(word)) ?? null;
}

/**
 * Options for a tap round: the answer plus distractors, the theme's own words
 * first and the other trays' words only once the theme runs out.
 *
 * Drawing from the theme first is the point — a wrong answer should be a word
 * the child has just been taught, so getting it wrong teaches something.
 */
function optionsFor(
  answer: string, own: string[], foreign: string[], want: number, next: () => number,
): string[] {
  const pool = [
    ...shuffled(own.filter(word => word !== answer), next),
    ...shuffled(foreign.filter(word => word !== answer && !own.includes(word)), next),
  ];
  return shuffled([answer, ...pool.slice(0, Math.max(want - 1, 0))], next);
}

// ---------------------------------------------------------------------------
// The seven builders
// ---------------------------------------------------------------------------

const NUMERALS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

/** 「三」 up to ten, then the digits — a child reading 十二 is fine, 二十四 is not. */
function numeral(value: number): string {
  return value >= 0 && value <= 10 ? NUMERALS[value] : String(value);
}

function sentenceRound(
  source: ThemeGameSource, round: number, difficulty: Difficulty,
  word: string, foreign: string[], next: () => number,
): Round {
  const clause = clauseFor(source.vo, word);
  const sentence = source.answerPattern.replace("{answer}", word);

  if (round <= 2) {
    const blanked = clause ? clause.replace(word, "＿＿") : `我最鍾意${"＿＿"}。`;
    return {
      round, mode: "sentence", word,
      prompt: `聽住段介紹，填返個詞：${blanked}`,
      options: optionsFor(word, source.words, foreign, difficulty.options, next),
      answer: word, input: "tap",
      hint: difficulty.hints ? `第一個字係「${word[0]}」` : null,
      difficulty,
    };
  }

  // Rounds 3 and 4 produce rather than recognise. The chunks carry their own
  // punctuation, so the pieces laid end to end are the sentence exactly —
  // a frame without its full stop can never be assembled into one.
  const [frame, tail] = source.answerPattern.split("{answer}");
  // Round four adds a decoy chunk that is never used. The child has to see
  // that it does not belong rather than just placing everything on screen.
  const decoy = round === 4
    ? foreign.find(candidate => !source.words.includes(candidate))
      ?? source.words.find(candidate => candidate !== word)
    : undefined;
  const chunks = shuffled([frame, `${word}${tail ?? ""}`, ...(decoy ? [`${decoy}${tail ?? ""}`] : [])], next);
  return {
    round, mode: "sentence", word,
    prompt: difficulty.typing ? `打返成句：用「${word}」答「${source.question}」` : `砌返成句，講返「${word}」`,
    options: difficulty.typing ? [] : chunks,
    answer: sentence,
    input: difficulty.typing ? "type" : "order",
    hint: difficulty.hints ? frame : null,
    difficulty,
  };
}

function numberRound(
  source: ThemeGameSource, round: number, difficulty: Difficulty,
  word: string, _foreign: string[], next: () => number,
): Round {
  // Kept inside what the band can hold: the youngest count to five, the
  // oldest to ten, and nothing ever goes negative.
  const ceiling = difficulty.band === "3-5" ? 5 : 10;
  const other = source.words.find(candidate => candidate !== word) ?? word;
  const a = pick(ceiling, next);
  const b = pick(ceiling, next);

  // 「港鐵 × 七」 rather than 「七港鐵」. Cantonese wants a measure word between
  // the number and the noun, and it is a different one for every noun in the
  // catalogue (架／隻／個／間). Writing 七架 for 貝殼 would be teaching a
  // mistake, so the count is shown beside the word instead of glued to it.
  const count = (word: string, value: number) => `${word} × ${numeral(value)}`;

  // Numbers, deduped, answer never among the distractors. The subtraction
  // round used to be able to draw the same distractor twice.
  const numbers = (answer: number, candidates: number[]): string[] => {
    const seen = new Set([answer]);
    const out: string[] = [];
    for (const value of candidates) {
      if (value < 0 || seen.has(value)) continue;
      seen.add(value);
      out.push(numeral(value));
      if (out.length >= difficulty.options - 1) break;
    }
    return shuffled([numeral(answer), ...out], next);
  };

  if (round === 1) {
    return {
      round, mode: "number", word,
      prompt: `數一數：畫入面有幾多「${word}」？`,
      options: numbers(a, [a + 1, a - 1, a + 2, a + 3]),
      answer: numeral(a), input: "tap",
      hint: difficulty.hints ? "一件一件咁點住數。" : null,
      difficulty,
    };
  }
  if (round === 2) {
    // A tie would have two right answers, so nudge one side before asking.
    const mine = a === b ? a + 1 : a;
    return {
      round, mode: "number", word,
      prompt: `${count(word, mine)}，${count(other, b)} —— 邊樣多啲？`,
      options: shuffled([word, other], next),
      answer: mine > b ? word : other, input: "tap",
      hint: difficulty.hints ? "邊行長啲就邊樣多啲。" : null,
      difficulty,
    };
  }
  if (round === 3) {
    return {
      round, mode: "number", word,
      prompt: `${count(word, a)}，${count(other, b)} —— 加埋一共幾多？`,
      options: numbers(a + b, [a + b + 1, a + b - 1, a + b + 2, a]),
      answer: numeral(a + b), input: "tap",
      hint: difficulty.hints ? `先數${word}，再繼續數落去。` : null,
      difficulty,
    };
  }
  // Enough to take away from, so the last round is never "3 minus 3".
  const total = Math.max(a, 3);
  const gone = pick(total - 1, next);
  return {
    round, mode: "number", word,
    prompt: `${count(word, total)}，走咗${numeral(gone)}個 —— 仲剩返幾多？`,
    options: difficulty.typing ? []
      : numbers(total - gone, [total - gone + 1, total - gone - 1, total, gone]),
    answer: numeral(total - gone), input: difficulty.typing ? "type" : "tap",
    hint: difficulty.hints ? "由總數度數返轉頭。" : null,
    difficulty,
  };
}

function spotRound(
  source: ThemeGameSource, round: number, difficulty: Difficulty,
  word: string, foreign: string[], next: () => number,
): Round {
  if (round === 3) {
    // The odd one out has to come from another theme, or there is no odd one
    // — which is why the builder is given the rest of the wall.
    const stranger = shuffled(foreign.filter(candidate => !source.words.includes(candidate)), next)[0];
    if (stranger) {
      return {
        round, mode: "spot", word: stranger,
        prompt: `邊一個唔屬於「${source.nameZh}」？`,
        options: shuffled([stranger, ...source.words.slice(0, difficulty.options - 1)], next),
        answer: stranger, input: "tap",
        hint: difficulty.hints ? "諗返段片講過啲乜。" : null,
        difficulty,
      };
    }
  }
  const hidden = round === 4;
  return {
    round, mode: "spot", word,
    prompt: hidden ? `記住位置，然後搵返「${word}」` : `搵出「${word}」`,
    // Round 2 onward widens the field past the difficulty's base, which is
    // what makes a second look actually harder rather than identical.
    options: optionsFor(word, source.words, foreign,
      Math.min(difficulty.options + (round >= 2 ? 2 : 0), 8), next),
    answer: word, input: "tap",
    hint: difficulty.hints ? clauseFor(source.vo, word) : null,
    difficulty,
  };
}

function predictRound(
  source: ThemeGameSource, round: number, difficulty: Difficulty,
  word: string, foreign: string[], next: () => number,
): Round {
  const clauses = clausesOf(source.vo);
  const at = clauses.findIndex(clause => clause.includes(word));
  // How far back the narration is cut off. Round 1 plays the word's own
  // clause with the word bleeped, so the answer is almost given away; by
  // round 4 the child hears only the opening and has to infer it.
  const stop = Math.max((at < 0 ? 0 : at) - (round - 1), 0);
  const cut = clauses.slice(0, stop + 1).join("").replace(word, "……");
  // How many things still get named from the cut up to and including the
  // answer. Words late in the paragraph land on the same stopping point at
  // rounds 2, 3 and 4, which reads as the same question asked three times —
  // so the ask itself says how far ahead the child has to reach.
  const ahead = (at < 0 ? 0 : at) - stop;

  return {
    round, mode: "predict", word,
    prompt: ahead > 1
      ? `聽到呢度：「${cut}」—— 之後仲會講到${numeral(ahead)}樣，估下最後嗰樣係邊個？`
      : `聽到呢度：「${cut}」—— 估下跟住講緊邊一樣？`,
    options: optionsFor(word, source.words, foreign, difficulty.options, next),
    answer: word, input: "tap",
    hint: difficulty.hints ? `同「${source.nameZh}」有關。` : null,
    difficulty,
  };
}

function choiceRound(
  source: ThemeGameSource, round: number, difficulty: Difficulty,
  word: string, _foreign: string[], next: () => number,
): Round {
  // Nothing here is marked. `answer: ""` is the contract with the UI: no
  // green tick, no red cross, and the fragment is earned by answering.
  const prompts: Record<number, string> = {
    1: source.question,
    2: `${source.question}（揀完再話我知點解）`,
    3: `${source.question}　揀完自己講返個原因。`,
    4: `你估屋企人會揀邊一樣？揀完可以問返佢啱唔啱。`,
  };
  return {
    round, mode: "choice", word,
    prompt: prompts[round] ?? source.question,
    options: round >= 3 && difficulty.typing ? [] : shuffled(source.words, next),
    answer: "",
    input: round >= 3 && difficulty.typing ? "type" : "tap",
    hint: source.answerPattern.replace("{answer}", "＿＿"),
    difficulty,
  };
}

function moveRound(
  source: ThemeGameSource, round: number, difficulty: Difficulty,
  word: string, _foreign: string[], next: () => number,
): Round {
  // The sequence grows with the round, which is the memory part: round four
  // is four moves held in the head, not four moves read off the screen. This
  // round's own word always leads, so four rounds still cover four words.
  const sequence = [
    word, ...shuffled(source.words.filter(candidate => candidate !== word), next),
  ].slice(0, round);
  return {
    round, mode: "move", word,
    prompt: sequence.length === 1
      ? `跟住做：${sequence[0]}`
      : `記住次序，然後一次過做晒：${sequence.join(" → ")}`,
    options: sequence,
    answer: sequence.join(" → "),
    input: "do",
    hint: difficulty.hints ? "慢慢嚟，做唔啱都冇問題。" : null,
    difficulty,
  };
}

function makeRound(
  source: ThemeGameSource, round: number, difficulty: Difficulty,
  word: string, _foreign: string[], next: () => number,
): Round {
  const wanted = [
    word, ...shuffled(source.words.filter(candidate => candidate !== word), next),
  ].slice(0, Math.min(round, source.words.length));
  return {
    round, mode: "make", word,
    prompt: round >= 4
      ? `自由砌一幅「${source.nameZh}」，砌完幫佢改個名。`
      : `砌一幅畫，入面要有：${wanted.join("、")}`,
    options: wanted,
    answer: "",
    input: "free",
    hint: round === 3 ? "仲要揀返個背景。" : null,
    difficulty,
  };
}

type Builder = (
  source: ThemeGameSource, round: number, difficulty: Difficulty,
  word: string, foreign: string[], next: () => number,
) => Round;

const BUILDERS: Record<GameMode, Builder> = {
  sentence: sentenceRound,
  number: numberRound,
  spot: spotRound,
  predict: predictRound,
  choice: choiceRound,
  move: moveRound,
  make: makeRound,
};

/**
 * The four rounds of one theme, in order.
 *
 * Round N is what the child plays for their Nth fragment, so a child part-way
 * through a theme picks up where they stopped rather than starting over. The
 * word each round is about walks through the theme's four words, so finishing
 * a card means having met all four.
 */
export function buildRounds(source: ThemeGameSource, options: BuildOptions = {}): Round[] {
  const foreign = options.foreignWords ?? [];
  const salt = options.salt ?? 0;
  return Array.from({ length: ROUNDS_PER_THEME }, (_, index) => {
    const round = index + 1;
    const next = rng(hash(`${source.themeId}|${source.mode}|${round}|${salt}`));
    const word = source.words[index % Math.max(source.words.length, 1)] ?? source.nameZh;
    return BUILDERS[source.mode](source, round, difficultyFor(options.age, round), word, foreign, next);
  });
}

/** Just the one round a child is up to. */
export function roundAt(
  source: ThemeGameSource, earned: number, options: BuildOptions = {},
): Round | null {
  if (earned >= ROUNDS_PER_THEME) return null;
  return buildRounds(source, options)[Math.max(earned, 0)];
}

/**
 * Whether an answer counts.
 *
 * The open-ended modes accept anything non-empty on purpose: 你會點揀 has no
 * right answer, and marking a child's own preference wrong is the one thing
 * that mode must never do.
 */
export function isCorrect(round: Round, given: string): boolean {
  const answer = round.answer.trim();
  const said = given.trim();
  if (!answer) return said.length > 0;
  if (round.input === "type") {
    // Typed answers are compared without punctuation or spaces: a child who
    // wrote the sentence and left off the full stop got it right.
    const bare = (text: string) => text.replace(/[\s。，、！？.,!?]/g, "");
    return bare(said) === bare(answer);
  }
  return said === answer;
}
