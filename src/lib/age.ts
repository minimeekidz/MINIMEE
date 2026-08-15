// Age is derived, never stored.
//
// A stored age is wrong the day after the birthday and there is no job that
// would ever fix it, so `children.dob` is the only thing kept and the number
// is computed on read.
//
// `birth_year` is the legacy column: families who signed up before dob
// existed have only a year, which gives an age that is off by up to one
// depending on whether the birthday has passed. That case is reported rather
// than hidden — the page says 「約 8 歲」 instead of claiming to know.

export interface DerivedAge {
  years: number;
  /** True when it came from a birth year alone and could be one out. */
  approximate: boolean;
}

export function ageFrom(dob: string | null | undefined, birthYear?: number | null, now = new Date()): DerivedAge | null {
  if (dob) {
    const born = new Date(dob);
    if (!Number.isNaN(born.getTime())) {
      let years = now.getFullYear() - born.getFullYear();
      // Not had this year's birthday yet.
      const monthDiff = now.getMonth() - born.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) years -= 1;
      if (years >= 0) return { years, approximate: false };
    }
  }
  if (birthYear && birthYear > 1900) {
    return { years: now.getFullYear() - birthYear, approximate: true };
  }
  return null;
}

/** 「8 歲」 or 「約 8 歲」, or nothing at all when the age is private. */
export function ageLabel(age: DerivedAge | null): string {
  if (!age) return "";
  return age.approximate ? `約 ${age.years} 歲` : `${age.years} 歲`;
}

/** Whether a birthday is today, for the pets and the profile to notice. */
export function isBirthdayToday(dob: string | null | undefined, now = new Date()): boolean {
  if (!dob) return false;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return false;
  return born.getMonth() === now.getMonth() && born.getDate() === now.getDate();
}

/** MM-DD, which is what the pets' birthday events key on. */
export function birthdayKey(dob: string | null | undefined): string | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  return `${String(born.getMonth() + 1).padStart(2, "0")}-${String(born.getDate()).padStart(2, "0")}`;
}
