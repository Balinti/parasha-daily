import {
  getTodaysParasha,
  getVerse,
  getCommentary,
  type ParashaInfo,
  type VerseRef,
  type Commentary,
} from "./sefaria";

export type TodayPayload = {
  parasha: ParashaInfo;
  /** 1-7, where Sunday=1, Saturday=7 (computed in Asia/Jerusalem) */
  dayOfParasha: number;
  /** The aliya ref the verse came from, e.g. "Leviticus 25:1-13" */
  aliyaRef?: string;
  /** Today's chosen verse */
  verse: VerseRef;
  /** Rashi commentary on today's verse */
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

export async function getTodayPayload(now = new Date()): Promise<TodayPayload> {
  const parasha = await getTodaysParasha();
  const { dateKey, dayOfWeek } = israelTimeParts(now);
  const day = dayOfWeek + 1; // Sun=1..Sat=7

  // Pick aliya for today; fall back to whole-parasha ref if aliyot missing.
  let aliyaRef: string | undefined;
  if (parasha.aliyot && parasha.aliyot.length >= 7) {
    aliyaRef = parasha.aliyot[day - 1];
  } else if (parasha.aliyot && parasha.aliyot.length > 0) {
    aliyaRef = parasha.aliyot[Math.min(day - 1, parasha.aliyot.length - 1)];
  }
  const sourceRef = aliyaRef ?? parasha.ref;
  const verseRef = firstVerseOfRange(sourceRef);

  const [verse, rashi] = await Promise.all([
    getVerse(verseRef),
    getCommentary("Rashi", verseRef),
  ]);

  return {
    parasha,
    dayOfParasha: day,
    aliyaRef,
    verse,
    rashi,
    forDate: dateKey,
  };
}
