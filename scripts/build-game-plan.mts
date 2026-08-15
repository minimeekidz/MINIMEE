// Writes docs/design-reference/theme-game-plan.md.
//
// Generated rather than typed, for the same reason the theme book is: the
// words, the VO and the actual round prompts have to be the ones the game
// really produces. A table Em plans a month's shoot from must not be a
// paraphrase of the code — it has to be the code's own output, or the day it
// drifts is the day she prepares the wrong material.
//
//   npx vite-node scripts/build-game-plan.mts

import { writeFileSync } from "node:fs";
import { buildRounds, difficultyFor, FAMILIES, GAME_MODES, ROUNDS_PER_THEME, type GameMode }
  from "../src/lib/games";
import themeBook from "../src/data/themeBook.json";

interface BookTheme {
  themeId: string; themeNo: number; nameZh: string;
  words: string[]; vo: string; question: string; answerPattern: string;
}
const THEMES = themeBook.themes as BookTheme[];
const byId = new Map(THEMES.map(theme => [theme.themeId, theme]));

// The order releases go on the wall. The first six are what is live now; the
// rest is a proposal, and the whole point of /admin/themes is that Em can
// reorder it without anybody touching this file.
const LIVE = ["theme-01", "theme-09", "theme-08", "theme-03", "theme-14", "theme-19"];
const ORDER = [...LIVE, ...THEMES.map(theme => theme.themeId).filter(id => !LIVE.includes(id))];

// Seven modes on a seven-cycle, which is what makes the rule hold: six themes
// sit on the wall at once (three new, three carried over), and any six
// consecutive entries of a seven-cycle are all different. Six modes would
// have worked only until the first theme was held back a month.
const CYCLE: GameMode[] = ["number", "sentence", "spot", "predict", "make", "move", "choice"];
const modeAt = (position: number) => CYCLE[position % CYCLE.length];

const lines: string[] = [];
const say = (text = "") => lines.push(text);

say("# 主題小遊戲：玩法、對應主題、詞彙同素材清單");
say();
say("> 呢份係 `npx vite-node scripts/build-game-plan.mts` 出嘅，唔好直接改。");
say("> 改咗遊戲邏輯（`src/lib/games.ts`）或者主題工作簿之後，行返一次就會更新。");
say();
say("## 點解係七個玩法");
say();
say("碎片拼合室同一時間有六格：每個月新上三個主題，上個月三個繼續留喺牆上面等小朋友");
say("儲完。戲院一次過放呢啲主題嘅學習影片，所以**牆上面六個主題，六個玩法都唔可以撞**。");
say("七個玩法排成一個七格循環，任何連續六格都一定唔同 —— 就算有個主題壓多一個月都唔會撞。");
say("呢個規則係寫死喺資料庫度（`theme_releases` 嘅 partial unique index），唔係靠後台提醒。");
say();
say("每個主題都要玩**四次**先砌到一張 MEE 卡，一次一塊碎片。四個 round 一次難過一次：");
say("第一 round 認得出就得，第四 round 要自己講／自己砌／自己做。");
say("小朋友重複玩已經砌完嘅主題，題目會重新抽過 —— 玩法一樣，題目唔同。");
say();

// ---------------------------------------------------------------------------
say("## 表一：而家牆上面六個主題");
say();
say("| 格 | 主題 | 玩法 | 學習範疇 | 四個詞 | 提問（用喺你會點揀） |");
say("|---|---|---|---|---|---|");
LIVE.forEach((id, index) => {
  const theme = byId.get(id)!;
  const mode = modeAt(index);
  say(`| ${index + 1} | ${String(theme.themeNo).padStart(2, "0")} ${theme.nameZh} `
    + `| **${FAMILIES[mode].nameZh}** | ${FAMILIES[mode].domain} `
    + `| ${theme.words.join("・")} | ${theme.question} |`);
});
say();
say("### VO 旁白（每個主題一段，已經入咗資料庫 `themes.vo`）");
say();
LIVE.forEach((id, index) => {
  const theme = byId.get(id)!;
  say(`**${index + 1}. ${theme.nameZh}（${FAMILIES[modeAt(index)].nameZh}）**`);
  say();
  say(`> ${theme.vo}`);
  say();
  say(`答句式：\`${theme.answerPattern}\``);
  say();
});

// ---------------------------------------------------------------------------
say("## 表二：四個 round 實際出咩題");
say();
say("下面每一格都係程式真係會生成嘅題目（用 6–8 歲難度做例）。");
say();
LIVE.forEach((id, index) => {
  const theme = byId.get(id)!;
  const mode = modeAt(index);
  const others = LIVE.filter(other => other !== id).flatMap(other => byId.get(other)!.words);
  const rounds = buildRounds({ ...theme, mode }, { age: 7, foreignWords: others });

  say(`### ${theme.nameZh} — ${FAMILIES[mode].nameZh}（${FAMILIES[mode].domain}）`);
  say();
  say(FAMILIES[mode].doing);
  say();
  say("| Round | 對應詞 | 題目 | 小朋友做啲乜 | 選項 | 答案 |");
  say("|---|---|---|---|---|---|");
  for (const round of rounds) {
    const doing = { tap: "撳一個", type: "打字", order: "砌返個次序", do: "做動作", free: "自由砌" }[round.input];
    say(`| ${round.round} | ${round.word} | ${round.prompt.replace(/\|/g, "／")} `
      + `| ${doing} | ${round.options.join("・") || "—"} | ${round.answer || "冇啱冇錯"} |`);
  }
  say();
});

// ---------------------------------------------------------------------------
say("## 表三：年齡難度");
say();
say("年齡係由 `children.dob` 計出嚟嘅，唔會儲低。冇填生日就用報名嗰陣揀嘅年齡組別；");
say("兩樣都冇就當 6–8 歲 —— 中間嗰檔，因為最差嘅情況係叫一個五歲小朋友打字。");
say();
say("| 年齡 | Round 1 | Round 2 | Round 3 | Round 4 |");
say("|---|---|---|---|---|");
for (const band of ["3-5", "6-8", "9-12"] as const) {
  const cells = [1, 2, 3, 4].map(round => {
    const level = difficultyFor(band, round);
    const bits = [`${level.options} 個選項`];
    if (level.hints) bits.push("有提示");
    if (level.typing) bits.push("**要打字**");
    if (level.seconds) bits.push(`${level.seconds}s 計時`);
    return bits.join("、");
  });
  say(`| ${band} 歲 | ${cells.join(" | ")} |`);
}
say();
say("計時器只影響有冇星星，**任何情況下都唔會攞走碎片**。");
say("答錯冇懲罰，冇分數、冇血、冇 game over，再撳過就得。");
say();

// ---------------------------------------------------------------------------
say("## 表四：36 個主題玩法輪換建議");
say();
say("一個月上三個，即係 12 個月行完一轉。第 7 位開始係建議，唔係死嘅 ——");
say("喺 `/admin/themes` 度改個次序或者改個玩法就得，改完全部小朋友即刻同步。");
say();
say("| 上架次序 | 月份 | 主題 | 玩法 | 學習範疇 | 四個詞 |");
say("|---|---|---|---|---|---|");
ORDER.forEach((id, index) => {
  const theme = byId.get(id)!;
  const mode = modeAt(index);
  say(`| ${index + 1} | 第 ${Math.floor(index / 3) + 1} 個月 `
    + `| ${String(theme.themeNo).padStart(2, "0")} ${theme.nameZh} `
    + `| ${FAMILIES[mode].nameZh} | ${FAMILIES[mode].domain} | ${theme.words.join("・")} |`);
});
say();

// ---------------------------------------------------------------------------
say("## 我需要你準備嘅素材");
say();
say("分三級。**A 級**係補咗差最遠嗰啲；**B 級**補咗會靚好多同好玩好多；");
say("**C 級**係遲啲先算。三級都唔會擋住上線 —— 所有玩法而家已經跑得起，一張新圖都冇都照玩。");
say();

// Which themes actually land on which mode over the year, so the counts
// below are a real number of files to draw rather than "some".
const usedBy = (mode: GameMode) =>
  ORDER.map((id, index) => ({ theme: byId.get(id)!, mode: modeAt(index) }))
    .filter(entry => entry.mode === mode)
    .map(entry => `${String(entry.theme.themeNo).padStart(2, "0")} ${entry.theme.nameZh}`);

say("### A 級 — 排最前，冇咗個玩法得個殼");
say();
say("**冇一樣係會令個網爛嘅** —— 所有玩法而家都跑得起，碎片照攞。下面「冇嘅話」");
say("嗰欄講嘅係冇咗會退化成點，唔係會壞。");
say();
say("| # | 素材 | 數量 | 格式 | 用喺邊 | 冇嘅話 |");
say("|---|---|---|---|---|---|");
say("| A1 | **VO 旁白錄音**，每個主題一段 | 36 段（先做牆上面 6 段） | mp3／m4a，一段一個檔，命名 `theme-01.mp3` | 全部玩法；估下會點靠佢 | 變成淨係得字睇。估下會點本身係「聽到一半停低」，冇聲就冇咗個玩法嘅重點 |");
say("| A2 | **VO 分句時間點** | 每段 4–6 個時間點 | json／csv：`theme-01, 0.0, 3.2, 7.8, 12.4` | 估下會點喺指定位停 | 要成段播晒先停到，變咗答案早已經講咗出嚟 |");
say(`| A3 | **四個動作示範**（跟住做） | ${usedBy("move").length} 個主題 × 4 個動作 = ${usedBy("move").length * 4} 個 | png，或者 2–3 格 gif，透明底，寵物做示範 | 跟住做 | 淨係得文字寫住個動作名，小朋友唔知點做 |`);
say(`| A4 | **可以拖嘅道具**（砌一砌） | ${usedBy("make").length} 個主題 × 4 件 = ${usedBy("make").length * 4} 件 | png 透明底，約 256×256 | 砌一砌 | 淨係得文字牌仔可以拖，唔似砌畫 |`);
say(`| A5 | **砌一砌背景** | ${usedBy("make").length} 個主題 × 1–2 張 | 16:9，同場景畫風一致 | 砌一砌 round 3–4 | Round 3 揀唔到背景，跳過咗 |`);
say();
say("A3–A5 只係關乎用嗰個玩法嘅主題，唔使 36 個都做：");
say();
say(`- **跟住做**（${usedBy("move").length} 個）：${usedBy("move").join("、")}`);
say(`- **砌一砌**（${usedBy("make").length} 個）：${usedBy("make").join("、")}`);
say(`- **搵一搵**（${usedBy("spot").length} 個，見 B3）：${usedBy("spot").join("、")}`);
say(`- **你會點揀**（${usedBy("choice").length} 個，見 C4）：${usedBy("choice").join("、")}`);
say();

say("### B 級 — 補咗會好好多");
say();
say("| # | 素材 | 數量 | 格式 | 用喺邊 |");
say("|---|---|---|---|---|");
say("| B1 | **詞彙貼紙圖**（每個詞一張） | 144 張（36 主題 × 4 詞），而家得 17 張 | png 透明底，檔名就係個詞，例如 `港鐵.png` | 全部玩法嘅提示圖、數一數要數嘅嘢、搵一搵嘅格仔 |");
say("| B2 | **每個詞嘅發音** | 144 個短檔 | mp3，1–2 秒 | 3–5 歲組讀唔到字，要聽 |");
say(`| B3 | **搵一搵嘅熱鬧背景** | ${usedBy("spot").length} 張（一個主題一張） | 16:9，入面藏住嗰四樣嘢 | 搵一搵可以由「撳格仔」變成「喺幅畫入面搵」 |`);
say("| B4 | **音效** | 5 個 | wav／mp3，各 0.3–1 秒 | 答啱、答錯、攞到碎片、攞到星星、砌成一張卡 |");
say("| B5 | **七個玩法嘅小圖標** | 7 個 | png 透明底，64×64 | 遊戲上面嗰個名牌、後台個表 |");
say("| B6 | **星星圖** | 1 個（可以加個「攞唔到」灰版） | png 透明底 | 計時內完成嗰粒星 |");
say();

say("### C 級 — 遲啲先");
say();
say("| # | 素材 | 用喺邊 |");
say("|---|---|---|");
say("| C1 | BOOK 3、BOOK 4 嘅正式名 | 卡冊；而家頂住叫「BOOK 3」「BOOK 4」，冇亂改個名扮真 |");
say("| C2 | 24 張 MEE 卡嘅正式卡名 | 而家用返主題名做卡名 |");
say("| C3 | 寵物多角度 sprite | 跟住做入面寵物示範動作 |");
say(`| C4 | 「你會點揀」嘅情境插畫（${usedBy("choice").length} 個主題 × 4 張） | 而家用文字選項，有圖會親切好多 |`);
say();

say("### 你唔使準備嘅（已經有）");
say();
say("- 36 個主題嘅名、編號、四個詞、提問、答句式、VO 文字稿 —— 全部由你個工作簿入咗資料庫。");
say("- 七個玩法嘅題目生成、難度分級、四個 round 嘅升級 —— 已經寫好，唔使圖都跑得。");
say("- 後台換主題／換玩法嘅掣 —— `/admin/themes`，撳完全網即時同步。");
say("- 撞玩法嘅防呆 —— 資料庫層面拒絕，唔靠人記住。");
say();

say("### 交檔點交");
say();
say("- 圖：`public/assets/uploads/` 入面開個資料夾，檔名就用個詞（例如 `港鐵.png`）。");
say("  貼紙系統就係靠檔名認個詞嘅，唔使再填表。");
say("- 聲：`theme-01.mp3` 咁樣命名，我會上私人 bucket，出面攞唔到永久連結。");
say("- 一次過交唔切唔緊要，補幾多用幾多 —— 冇圖嘅詞會自動用文字頂住，唔會爛。");
say();

writeFileSync("docs/design-reference/theme-game-plan.md", `${lines.join("\n")}\n`);
console.log(`wrote docs/design-reference/theme-game-plan.md (${lines.length} lines)`);

// A guard, not decoration: if the cycle ever stops guaranteeing six distinct
// modes in a row, this file's whole premise is wrong and it should say so
// loudly rather than print a schedule that breaks the database's rule.
for (let start = 0; start + 6 <= ORDER.length; start += 1) {
  const window = new Set(Array.from({ length: 6 }, (_, offset) => modeAt(start + offset)));
  if (window.size !== 6) {
    throw new Error(`positions ${start + 1}–${start + 6} share a game mode`);
  }
}
if (GAME_MODES.length !== CYCLE.length || ROUNDS_PER_THEME !== 4) {
  throw new Error("the plan assumes seven modes and four rounds");
}
