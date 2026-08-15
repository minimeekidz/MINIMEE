import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Weather } from "./petSpawn";

// 天文台. What the sky is doing, and what day it is on the lunar calendar.
//
// The rules live here rather than only inside the edge function so they can
// be tested: the parsing of 「八月十五」 and the decision that a rainstorm
// warning outranks the rain gauge are exactly the things that go quietly
// wrong once a year and are never noticed until a child is told it is 中秋
// on the wrong evening.
//
// The fetch goes through `hk-almanac` (supabase/functions/) rather than
// straight to HKO — the open data does not promise CORS headers, and one
// cached call for everybody is kinder than one per child per page load.
//
// Em's rule when anything fails: weather is `clear`, no festival. A pet
// saying 「落雨啦」 on a sunny day in Hong Kong is worse than a pet saying
// nothing about the weather at all.

export type LunarFestival = "lunar-new-year" | "dragon-boat" | "mid-autumn";

export interface Almanac {
  weather: Weather;
  rainfallMm: number;
  warnings: string[];
  lunarText: string;
  lunarMonth: number | null;
  lunarDay: number | null;
  festival: LunarFestival | null;
  /** True when this is the fallback rather than a real reading. */
  degraded: boolean;
}

export const CLEAR: Almanac = {
  weather: "clear", rainfallMm: 0, warnings: [],
  lunarText: "", lunarMonth: null, lunarDay: null,
  festival: null, degraded: true,
};

/**
 * A warning outranks the rain gauge, and storm outranks drizzle.
 *
 * 安全天氣限制 is the top of the workbook's ordering, so anything that means
 * "stay indoors" has to win over a gauge that happens to read zero — a
 * typhoon signal in Hong Kong is often a dry, very windy day.
 */
export function classifyWeather(rainfallMm: number, warnings: string[]): Weather {
  // HKO's actual warning codes, which all begin with W: WTCSGNL is the
  // tropical cyclone signal, WRAIN the rainstorm signal (suffixed A/R/B),
  // WTS thunderstorm, WL landslip, WFNTSA flooding in the northern New
  // Territories, WTMW tsunami. An earlier version matched a "TC" prefix and
  // therefore never matched a typhoon at all.
  //
  // Deliberately not here: WFIRE, WHOT, WCOLD. They are real warnings but
  // they are not weather a pet should shelter from — the sheet's
  // drizzle/storm columns are about rain.
  const severe = ["WTCSGNL", "WRAIN", "WTS", "WL", "WFNTSA", "WTMW"];
  if (warnings.some(code => severe.some(prefix => code.startsWith(prefix)))) return "storm";
  if (rainfallMm >= 5) return "storm";
  if (rainfallMm > 0) return "drizzle";
  return "clear";
}

const MONTHS: Record<string, number> = {
  正: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6,
  七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 冬: 11, 十二: 12, 臘: 12,
};

const DIGITS: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
};

/** 「八月」 → 8. 「臘月」 and 「冬月」 are the traditional names for 12 and 11. */
export function lunarMonthNumber(text: string): number | null {
  return MONTHS[text] ?? null;
}

/** 「初五」 → 5, 「十五」 → 15, 「廿三」 → 23, 「卅一」 → 31. */
export function lunarDayNumber(text: string): number | null {
  if (text.startsWith("初")) return DIGITS[text[1]] ?? null;
  if (text === "十") return 10;
  if (text === "二十") return 20;
  if (text.startsWith("十")) return 10 + (DIGITS[text[1]] ?? 0);
  if (text.startsWith("廿")) return 20 + (DIGITS[text[1]] ?? 0);
  if (text.startsWith("卅")) return 30 + (DIGITS[text[1]] ?? 0);
  return null;
}

/** Pulls the month and day out of HKO's 「丙午年八月十五」 style string. */
export function parseLunar(text: string): { month: number | null; day: number | null } {
  const month = /([正一二三四五六七八九十冬臘]+)月/.exec(text)?.[1];
  const day = /月(初[一二三四五六七八九十]|二十|[十廿卅][一二三四五六七八九]?)/.exec(text)?.[1];
  return {
    month: month ? lunarMonthNumber(month) : null,
    day: day ? lunarDayNumber(day) : null,
  };
}

/**
 * The three festivals by lunar rule, not by a date somebody has to remember
 * to update: 新年 正月初一, 端午 五月初五, 中秋 八月十五.
 */
export function festivalFor(month: number | null, day: number | null): LunarFestival | null {
  if (month === null || day === null) return null;
  if (month === 1 && day === 1) return "lunar-new-year";
  if (month === 5 && day === 5) return "dragon-boat";
  if (month === 8 && day === 15) return "mid-autumn";
  return null;
}

export const FESTIVAL_NAMES: Record<LunarFestival, string> = {
  "lunar-new-year": "農曆新年",
  "dragon-boat": "端午節",
  "mid-autumn": "中秋節",
};

interface AlmanacResponse {
  weather?: { code?: Weather; rainfallMm?: number; warnings?: string[] };
  lunar?: { text?: string; month?: number | null; day?: number | null } | null;
  festival?: LunarFestival | null;
  degraded?: boolean;
}

export async function fetchAlmanac(date?: string): Promise<Almanac> {
  if (!supabase) return CLEAR;
  try {
    const { data, error } = await supabase.functions.invoke<AlmanacResponse>(
      "hk-almanac", { body: date ? { date } : {} });
    if (error || !data) return CLEAR;

    const text = data.lunar?.text ?? "";
    // Trust the function's parse when it has one, and re-derive from the text
    // when it does not: the same rules run on both sides, so a shape change
    // at HKO degrades to "no festival" rather than to a wrong festival.
    const parsed = parseLunar(text);
    const month = data.lunar?.month ?? parsed.month;
    const day = data.lunar?.day ?? parsed.day;

    return {
      weather: data.weather?.code ?? "clear",
      rainfallMm: data.weather?.rainfallMm ?? 0,
      warnings: data.weather?.warnings ?? [],
      lunarText: text,
      lunarMonth: month,
      lunarDay: day,
      festival: data.festival ?? festivalFor(month, day),
      degraded: Boolean(data.degraded),
    };
  } catch {
    return CLEAR;
  }
}

/** The town's almanac. Refreshed on mount; the edge function does the caching. */
export function useAlmanac(): Almanac {
  const [almanac, setAlmanac] = useState<Almanac>(CLEAR);
  useEffect(() => {
    let live = true;
    void fetchAlmanac().then(value => { if (live) setAlmanac(value); });
    return () => { live = false; };
  }, []);
  return almanac;
}
