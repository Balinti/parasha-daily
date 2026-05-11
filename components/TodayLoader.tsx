"use client";

import { useEffect, useRef, useState } from "react";
import {
  getTodayPayload,
  israelTimeParts,
  msUntilNextIsraelMidnight,
  pickDailySentence,
  APP_TIMEZONE,
  type TodayPayload,
} from "@/lib/today";
import StreakBadge from "@/components/StreakBadge";
import CommentaryCard from "@/components/CommentaryCard";
import ShabbatScreen from "@/components/ShabbatScreen";

const HEBREW_DAY_POSSESSIVES = [
  "פסוק ליום ראשון",
  "פסוק ליום שני",
  "פסוק ליום שלישי",
  "פסוק ליום רביעי",
  "פסוק ליום חמישי",
  "פסוק ליום שישי",
];

function hebrewNumeral(n: number): string {
  const letters = ["", "א", "ב", "ג", "ד", "ה", "ו"];
  return letters[n] ?? String(n);
}

// v2: Rashi-aware verse selection (parasha-wide chunks instead of first-of-aliya).
const CACHE_KEY = "parasha-daily.payload.v2";

type CachedPayload = {
  fetchedAt: number;
  payload: TodayPayload;
};

function readCache(): TodayPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload;
    // Cache is valid only for the same forDate (today in Asia/Jerusalem).
    const todayKey = israelTimeParts().dateKey;
    if (parsed.payload?.forDate !== todayKey) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

function writeCache(payload: TodayPayload) {
  try {
    const cached: CachedPayload = { fetchedAt: Date.now(), payload };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    /* ignore */
  }
}

export default function TodayLoader() {
  const [payload, setPayload] = useState<TodayPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Increment to force a re-fetch (e.g. when the Israel-time day rolls over).
  const [reloadKey, setReloadKey] = useState(0);
  const lastDateKey = useRef<string>(israelTimeParts().dateKey);

  // Fetch (and re-fetch) the payload whenever reloadKey changes.
  useEffect(() => {
    let cancelled = false;
    const cached = readCache();
    if (cached) {
      setPayload(cached);
    } else {
      setPayload(null);
    }
    setError(null);

    (async () => {
      try {
        const fresh = await getTodayPayload();
        if (cancelled) return;
        setPayload(fresh);
        writeCache(fresh);
      } catch (err) {
        if (cancelled) return;
        if (!cached) {
          setError(err instanceof Error ? err.message : String(err));
        }
        // If we already have a cached payload, silently keep it.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Schedule an auto-refresh exactly at the next Israel midnight, plus a
  // background poll every minute that catches any clock drift / sleep wake.
  // Also refresh whenever the tab becomes visible after the day rolled over.
  useEffect(() => {
    function checkRollover() {
      const nowKey = israelTimeParts().dateKey;
      if (nowKey !== lastDateKey.current) {
        lastDateKey.current = nowKey;
        setReloadKey((k) => k + 1);
      }
    }

    // Schedule a first refresh ~at midnight Asia/Jerusalem.
    let midnightTimer: ReturnType<typeof setTimeout> | undefined;
    function scheduleMidnight() {
      if (typeof window === "undefined") return;
      const ms = msUntilNextIsraelMidnight();
      midnightTimer = setTimeout(() => {
        checkRollover();
        scheduleMidnight(); // schedule the day after
      }, ms);
    }
    scheduleMidnight();

    // Belt-and-braces: poll every 60s in case the timer drifted (laptop sleep).
    const pollTimer = setInterval(checkRollover, 60_000);

    // And refresh when the tab regains focus.
    function onVisibility() {
      if (typeof document !== "undefined" && !document.hidden) {
        checkRollover();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (midnightTimer) clearTimeout(midnightTimer);
      clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (error && !payload) {
    return (
      <div className="mx-auto max-w-md text-center space-y-3 mt-24 px-6">
        <h1 className="text-2xl font-semibold">לא ניתן לטעון את פרשת השבוע</h1>
        <p className="text-fg-muted text-sm">
          ייתכן ששרתי ספריא אינם זמינים כרגע. נסו שוב בעוד רגע.
        </p>
        <pre
          className="text-xs text-fg-muted/70 mt-4 text-left whitespace-pre-wrap"
          dir="ltr"
        >
          {error}
        </pre>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="mx-auto max-w-2xl px-5 pt-12 pb-24" aria-busy>
        {/* Skeleton matching the real layout */}
        <div className="space-y-4 mb-8">
          <div className="flex items-baseline justify-between gap-3">
            <div className="h-3 w-40 rounded bg-rule/50 animate-pulse" />
            <div className="h-3 w-16 rounded bg-rule/50 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-rule/50 animate-pulse" />
            <div className="h-12 w-72 rounded bg-rule/40 animate-pulse" />
            <div className="h-3 w-full rounded bg-rule/40 animate-pulse mt-3" />
            <div className="h-3 w-5/6 rounded bg-rule/40 animate-pulse" />
          </div>
        </div>
        <div className="fancy-rule mb-8" />
        <div className="rounded-3xl border border-rule/60 bg-bg-elev p-8 space-y-4">
          <div className="h-7 w-full rounded bg-rule/40 animate-pulse" />
          <div className="h-7 w-3/4 rounded bg-rule/40 animate-pulse" />
        </div>
        <div className="rounded-2xl border border-rule/60 bg-bg-elev p-5 mt-6 space-y-3">
          <div className="h-4 w-16 rounded bg-rule/40 animate-pulse" />
          <div className="h-4 w-full rounded bg-rule/40 animate-pulse" />
          <div className="h-4 w-11/12 rounded bg-rule/40 animate-pulse" />
        </div>
      </div>
    );
  }

  const { parasha, dayOfParasha, verse, rashi, isShabbat } = payload;

  const today = new Date();
  const dateLabel = new Intl.DateTimeFormat("he-IL", {
    timeZone: APP_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(today);

  // Saturday — render the Shabbat shalom screen, no verse-of-the-day.
  if (isShabbat) {
    return <ShabbatScreen parasha={parasha} dateLabel={dateLabel} />;
  }

  const dayPossessiveHe =
    HEBREW_DAY_POSSESSIVES[dayOfParasha - 1] ?? "פסוק היום";

  // One rotating sentence from the parasha description per day, so the header
  // copy changes throughout the week even though the parasha is the same.
  const fullDescription = parasha.descriptionHe || parasha.description;
  const description = pickDailySentence(fullDescription, dayOfParasha - 1);

  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 pt-8 sm:pt-12">
      <header className="mb-8 space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-fg-muted text-sm font-medium tracking-wide">
            {dateLabel}
          </p>
          <p className="text-fg-muted text-xs whitespace-nowrap">
            יום {hebrewNumeral(dayOfParasha)} מתוך ו׳
          </p>
        </div>

        <div>
          <p className="text-fg-muted text-xs tracking-widest">פרשת השבוע</p>
          <h1
            className="he-display text-4xl sm:text-5xl mt-1"
            lang="he"
            dir="rtl"
            style={{ color: "var(--accent)" }}
          >
            {parasha.nameHe}
          </h1>
          {description && (
            <p className="text-fg-muted text-sm mt-3 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </header>

      <div className="fancy-rule mb-8" />

      <div className="mb-5 flex items-center justify-between gap-3">
        <p
          className="text-fg-muted text-sm tracking-wide"
          lang="he"
          dir="rtl"
        >
          {dayPossessiveHe}
        </p>
        <span
          className="he text-sm px-2.5 py-1.5 rounded-md border border-rule/60 text-fg-muted"
          title="מראה מקום"
          lang="he"
          dir="rtl"
        >
          {verse.refHe || verse.ref}
        </span>
      </div>

      <article
        className="rounded-3xl border border-rule/60 bg-bg-elev p-6 sm:p-8 shadow-sm"
        aria-labelledby="verse-heading"
      >
        <h2 id="verse-heading" className="sr-only">
          הפסוק של היום: {verse.refHe || verse.ref}
        </h2>
        {verse.he && (
          <p
            className="he text-[1.45rem] sm:text-[1.7rem] leading-loose text-fg"
            lang="he"
            dir="rtl"
          >
            {verse.he}
          </p>
        )}
      </article>

      <section className="mt-6 space-y-4">
        <CommentaryCard title="רש״י" he={rashi.he} en={rashi.en} />
      </section>

      <section className="mt-8 space-y-3">
        <StreakBadge />
        <p className="text-fg-muted text-sm text-center">
          חמש דקות ביום. כל הפרשה בשבוע.
        </p>
      </section>

      <footer className="mt-14 text-center space-y-2">
        <div className="fancy-rule" />
        <p className="text-fg text-sm pt-4 opacity-80">
          הטקסטים והפירושים באדיבות{" "}
          <a
            href={`https://www.sefaria.org/${encodeURIComponent(
              verse.ref.replace(/\s+/g, "_"),
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-accent/60 hover:text-accent"
          >
            ספריא
          </a>
          . קוד פתוח.
        </p>
      </footer>
    </div>
  );
}
