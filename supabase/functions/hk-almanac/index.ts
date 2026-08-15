// 香港天文台 — weather now, and the lunar date.
//
// Two things the town needs from the outside world, behind one function:
//
//   • 實況 + 警告, so a pet can say 「落雨啦」 only when it is actually raining
//     (`08_出沒地點規則` has a whole weather column that has been dark until
//     now)
//   • 農曆日期, so 新年 / 端午 / 中秋 land on the right day every year instead
//     of on a hard-coded date that is wrong from the second year onward
//
// It is a proxy rather than a direct browser call for three reasons, in
// order of how much they matter:
//
//   1. HKO's open data does not promise CORS headers, and a festival that
//      silently stops working in one browser is worse than one that never
//      worked.
//   2. Every child in Hong Kong would otherwise hit HKO on every page load.
//      Here it is one call per cache window for everybody.
//   3. When HKO is down the fallback lives in one place: weather is `clear`
//      and no festival fires. Em's rule — 「失敗時 clear」.

const HKO = "https://data.weather.gov.hk/weatherAPI/opendata";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** The three values `src/lib/petSpawn.ts` already understands. */
type Weather = "clear" | "drizzle" | "storm";

/** Weather changes; ten minutes is plenty and keeps HKO's load trivial. */
const WEATHER_TTL_MS = 10 * 60 * 1000;
/** A date's lunar date never changes, so this is only bounded by memory. */
const lunarCache = new Map<string, LunarDate>();
let weatherCache: { at: number; value: Almanac["weather"] } | null = null;

interface LunarDate {
  /** e.g. 「丙午年 八月 十五」 */
  text: string;
  month: number | null;
  day: number | null;
}

interface Almanac {
  weather: { code: Weather; rainfallMm: number; warnings: string[] };
  lunar: LunarDate | null;
  festival: "lunar-new-year" | "dragon-boat" | "mid-autumn" | null;
  /** True when any of this came from a fallback rather than from HKO. */
  degraded: boolean;
}

/**
 * Storm beats drizzle beats clear, and a warning beats the rain gauge. The
 * safety ordering in the workbook is 安全天氣限制 first, so anything that
 * says "stay in" has to win over anything that says "it is only spitting".
 */
function classify(rainfallMm: number, warnings: string[]): Weather {
  // HKO codes all begin with W. WTCSGNL is the tropical cyclone signal — an
  // earlier version matched a "TC" prefix and so never matched a typhoon.
  // WFIRE / WHOT / WCOLD are deliberately absent: real warnings, but not
  // weather a pet shelters from.
  const severe = ["WTCSGNL", "WRAIN", "WTS", "WL", "WFNTSA", "WTMW"];
  if (warnings.some(code => severe.some(prefix => code.startsWith(prefix)))) return "storm";
  if (rainfallMm >= 5) return "storm";
  if (rainfallMm > 0) return "drizzle";
  return "clear";
}

async function fetchWeather(): Promise<Almanac["weather"]> {
  const now = Date.now();
  if (weatherCache && now - weatherCache.at < WEATHER_TTL_MS) return weatherCache.value;

  const [current, warnings] = await Promise.all([
    fetch(`${HKO}/weather.php?dataType=rhrread&lang=tc`).then(r => r.json()),
    fetch(`${HKO}/weather.php?dataType=warnsum&lang=tc`).then(r => r.json()),
  ]);

  // rhrread reports rainfall per district as a max/min range. The highest
  // maximum across districts is the honest answer for "is it raining in Hong
  // Kong", and it is what a child looking out of the window would say.
  const readings: number[] = (current?.rainfall?.data ?? [])
    .map((entry: { max?: number }) => Number(entry?.max ?? 0))
    .filter((value: number) => Number.isFinite(value));
  const rainfallMm = readings.length ? Math.max(...readings) : 0;

  // warnsum is an object keyed by warning code.
  const codes = Object.keys(warnings ?? {});

  const value = { code: classify(rainfallMm, codes), rainfallMm, warnings: codes };
  weatherCache = { at: now, value };
  return value;
}

async function fetchLunar(date: string): Promise<LunarDate> {
  const cached = lunarCache.get(date);
  if (cached) return cached;

  const body = await fetch(`${HKO}/lunardate.php?date=${date}`).then(r => r.json());
  const text: string = body?.LunarYear ?? body?.lunarYear ?? "";
  const month = /([正一二三四五六七八九十冬臘]+)月/.exec(text)?.[1] ?? null;
  const day = /月(初[一二三四五六七八九十]|二十|[十廿卅][一二三四五六七八九]?)/.exec(text)?.[1] ?? null;

  const value: LunarDate = {
    text,
    month: month ? chineseMonth(month) : null,
    day: day ? chineseDay(day) : null,
  };
  lunarCache.set(date, value);
  return value;
}

const MONTHS: Record<string, number> = {
  "正": 1, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6,
  "七": 7, "八": 8, "九": 9, "十": 10, "十一": 11, "冬": 11, "十二": 12, "臘": 12,
};
function chineseMonth(text: string): number | null {
  return MONTHS[text] ?? null;
}

const DIGITS: Record<string, number> = {
  "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
  "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
};
function chineseDay(text: string): number | null {
  if (text.startsWith("初")) return DIGITS[text[1]] ?? null;
  if (text === "十") return 10;
  if (text === "二十") return 20;
  if (text.startsWith("十")) return 10 + (DIGITS[text[1]] ?? 0);
  if (text.startsWith("廿")) return 20 + (DIGITS[text[1]] ?? 0);
  if (text.startsWith("卅")) return 30 + (DIGITS[text[1]] ?? 0);
  return null;
}

/**
 * The three festivals Em named, by lunar rule rather than by a date somebody
 * has to remember to update: 新年 正月初一, 端午 五月初五, 中秋 八月十五.
 */
function festivalFor(lunar: LunarDate | null): Almanac["festival"] {
  if (!lunar || lunar.month === null || lunar.day === null) return null;
  if (lunar.month === 1 && lunar.day === 1) return "lunar-new-year";
  if (lunar.month === 5 && lunar.day === 5) return "dragon-boat";
  if (lunar.month === 8 && lunar.day === 15) return "mid-autumn";
  return null;
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Accept the date either way: supabase.functions.invoke posts a JSON body,
  // but a query string is what anybody debugging this by hand will reach for.
  const url = new URL(request.url);
  let asked = url.searchParams.get("date");
  if (!asked && request.method === "POST") {
    const body = await request.json().catch(() => null);
    asked = typeof body?.date === "string" ? body.date : null;
  }
  // Hong Kong's day, not the server's — the whole product is on HKT.
  const date = asked
    ?? new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

  let weather: Almanac["weather"] = { code: "clear", rainfallMm: 0, warnings: [] };
  let lunar: LunarDate | null = null;
  let degraded = false;

  // Settled separately: a lunar lookup failing should not also blind the
  // weather, and neither failing should take the town down.
  const [weatherResult, lunarResult] = await Promise.allSettled([
    fetchWeather(), fetchLunar(date),
  ]);
  if (weatherResult.status === "fulfilled") weather = weatherResult.value;
  else degraded = true;
  if (lunarResult.status === "fulfilled") lunar = lunarResult.value;
  else degraded = true;

  const almanac: Almanac = { weather, lunar, festival: festivalFor(lunar), degraded };

  return new Response(JSON.stringify(almanac), {
    headers: {
      ...CORS,
      "content-type": "application/json",
      // Browsers and any CDN in front may hold this for the same window.
      "cache-control": "public, max-age=600",
    },
  });
});
