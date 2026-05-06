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
  /** 1-7, where Sunday=1, Saturday=7 */
  dayOfParasha: number;
  /** The aliya ref the verse came from, e.g. "Leviticus 25:1-13" */
  aliyaRef?: string;
  /** Today's chosen verse */
  verse: VerseRef;
  /** Rashi commentary on today's verse */
  rashi: Commentary;
  /** ISO date the payload was generated for (user's locale-aware day) */
  forDate: string;
};

/**
 * Map JS day-of-week to "day of parasha" (1..7).
 * In Jewish reading order: Sunday is the 1st aliya, Saturday the 7th.
 * JS getDay(): Sunday=0, Saturday=6.
 */
export function dayOfParashaFromDate(d: Date): number {
  const js = d.getDay(); // 0..6
  return js + 1; // Sun=1, Sat=7
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
  const day = dayOfParashaFromDate(now);

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
    forDate: now.toISOString().slice(0, 10),
  };
}
