import {
  getTodaysParasha,
  getVerse,
  getCommentary,
  listVersesWithRashi,
  type ParashaInfo,
  type VerseRef,
  type Commentary,
} from "./sefaria";

export type TodayPayload = {
  parasha: ParashaInfo;
  /**
   * 1-6 for a learning day (Sun=1..Fri=6).
   * 7 is Shabbat — no daily lesson; see `isShabbat`.
   */
  dayOfParasha: number;
  /** True on Shabbat (Asia/Jerusalem) — verse/rashi will be empty. */
  isShabbat: boolean;
  /** The aliya ref the verse came from, e.g. "Leviticus 25:1-13" */
  aliyaRef?: string;
  /** Today's chosen verse (empty on Shabbat) */
  verse: VerseRef;
  /** Rashi commentary on today's verse (empty on Shabbat) */
  rashi: Commentary;
  /** YYYY-MM-DD in Asia/Jerusalem — the lesson key this payload represents */
  forDate: string;
};

/** The canonical timezone for the lesson rollover. */
export const APP_TIMEZONE = "Asia/Jerusalem";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Get the YYYY-MM-DD date string and 0-indexed day-of-week (Sun=0..Sat=6)
 * for the given instant, evaluated in Asia/Jerusalem.
 */
export function israelTimeParts(d: Date = new Date()): {
  dateKey: string;
  dayOfWeek: number;
} {
  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA gives "YYYY-MM-DD" already.
  const dateKey = dateFmt.format(d);

  const wkFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
  });
  const wk = wkFmt.format(d);
  const dayOfWeek = WEEKDAY_INDEX[wk] ?? 0;

  return { dateKey, dayOfWeek };
}

/**
 * Map a date to "day of parasha" (1..7) in Asia/Jerusalem time.
 * Sunday is the 1st aliya, Saturday the 7th.
 */
export function dayOfParashaFromDate(d: Date = new Date()): number {
  return israelTimeParts(d).dayOfWeek + 1;
}

/**
 * The "previous lesson day" key, skipping Shabbat.
 * Sunday's previous lesson is Friday; everything else is just yesterday.
 */
export function previousLessonDateKey(now: Date = new Date()): string {
  const { dayOfWeek } = israelTimeParts(now);
  // Sunday in Israel time -> step back two calendar days (skipping Shabbat).
  // (Saturday isn't a lesson day, so we don't define it for that case.)
  const back = dayOfWeek === 0 ? 2 : 1;
  const earlier = new Date(now.getTime() - back * 24 * 60 * 60 * 1000);
  return israelTimeParts(earlier).dateKey;
}

/**
 * Number of milliseconds until the next midnight in Asia/Jerusalem.
 * Used to schedule an auto-refresh when the day rolls over.
 */
export function msUntilNextIsraelMidnight(now: Date = new Date()): number {
  // Find current Israel time as a Date in UTC representation
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const hours = parseInt(parts.hour ?? "0", 10);
  const minutes = parseInt(parts.minute ?? "0", 10);
  const seconds = parseInt(parts.second ?? "0", 10);
  const elapsedSec = hours * 3600 + minutes * 60 + seconds;
  const remainingSec = 24 * 3600 - elapsedSec;
  // Add a 2-second safety margin
  return Math.max(remainingSec * 1000 + 2000, 1000);
}

/**
 * Take a Sefaria range ref like "Leviticus 25:1-13" and return the first
 * single verse, e.g. "Leviticus 25:1".
 */
export function firstVerseOfRange(rangeRef: string): string {
  // Examples we need to handle:
  //   "Leviticus 25:1-13"           -> "Leviticus 25:1"
  //   "Leviticus 25:1-26:2"         -> "Leviticus 25:1"
  //   "Leviticus 25"                -> "Leviticus 25:1"
  //   "Leviticus 25:1"              -> "Leviticus 25:1"
  const dashIdx = rangeRef.indexOf("-");
  const head = dashIdx === -1 ? rangeRef : rangeRef.slice(0, dashIdx);
  if (/:\d+$/.test(head)) return head;
  // No verse number — append :1
  return `${head}:1`;
}

/**
 * Pick a verse for `dayIndex` (0-based, 0..5) from a sorted list of verse refs.
 * Splits the list into 6 contiguous chunks and returns the first verse of the
 * chunk corresponding to today, so each day shows a different verse and the
 * verses progress through the parasha sequentially.
 */
export function pickDailyVerse(
  rashiVerses: string[],
  dayIndex: number,
): string | null {
  if (rashiVerses.length === 0) return null;
  const days = 6;
  const idx = Math.max(0, Math.min(dayIndex, days - 1));
  // Even distribution: chunk i starts at floor(i * N / 6).
  const startIdx = Math.floor((idx * rashiVerses.length) / days);
  return rashiVerses[Math.min(startIdx, rashiVerses.length - 1)];
}

export async function getTodayPayload(now = new Date()): Promise<TodayPayload> {
  const parasha = await getTodaysParasha();
  const { dateKey, dayOfWeek } = israelTimeParts(now);
  const day = dayOfWeek + 1; // Sun=1..Sat=7
  const isShabbat = dayOfWeek === 6;

  // Shabbat: skip the verse-of-the-day fetch entirely. Return the parasha
  // shell so the UI can render a "Shabbat shalom" rest screen.
  if (isShabbat) {
    return {
      parasha,
      dayOfParasha: day,
      isShabbat: true,
      verse: { ref: "", he: "", en: "" },
      rashi: { he: "", en: "" },
      forDate: dateKey,
    };
  }

  // Find every verse in the parasha that has direct Rashi commentary, then
  // split those into 6 chunks (one per learning day) and pick today's.
  // This guarantees:
  //   1. Every day's verse has a Rashi comment to study
  //   2. Verses progress sequentially through the parasha
  //   3. Each day shows a different verse
  const rashiVerses = await listVersesWithRashi(parasha.ref);

  let verseRef: string;
  if (rashiVerses.length > 0) {
    verseRef = pickDailyVerse(rashiVerses, day - 1) ?? firstVerseOfRange(parasha.ref);
  } else {
    // Extremely rare fallback: no Rashi anywhere in this parasha. Use the
    // first verse of today's aliya (if available) just to show something.
    const aliyaRef =
      parasha.aliyot && parasha.aliyot.length >= 6
        ? parasha.aliyot[day - 1]
        : parasha.ref;
    verseRef = firstVerseOfRange(aliyaRef);
  }

  const [verse, rashi] = await Promise.all([
    getVerse(verseRef),
    getCommentary("Rashi", verseRef),
  ]);

  return {
    parasha,
    dayOfParasha: day,
    isShabbat: false,
    verse,
    rashi,
    forDate: dateKey,
  };
}
