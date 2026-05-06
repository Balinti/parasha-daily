"use client";

import { useEffect, useState } from "react";
import { getTodayPayload, type TodayPayload } from "@/lib/today";
import StreakBadge from "@/components/StreakBadge";
import CommentaryCard from "@/components/CommentaryCard";

const HEBREW_DAYS = [
  "יום ראשון",
  "יום שני",
  "יום שלישי",
  "יום רביעי",
  "יום חמישי",
  "יום שישי",
  "שבת קודש",
];

const HEBREW_DAY_POSSESSIVES = [
  "פסוק ליום ראשון",
  "פסוק ליום שני",
  "פסוק ליום שלישי",
  "פסוק ליום רביעי",
  "פסוק ליום חמישי",
  "פסוק ליום שישי",
  "פסוק לשבת",
];

function hebrewNumeral(n: number): string {
  const letters = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז"];
  return letters[n] ?? String(n);
}

const CACHE_KEY = "parasha-daily.payload.v1";

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
    // Cache is valid only for the same forDate (today, in user's local TZ).
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.payload?.forDate !== today) return null;
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

  useEffect(() => {
    let cancelled = false;
    const cached = readCache();
    if (cached) {
      setPayload(cached);
    }
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

  const { parasha, dayOfParasha, verse, rashi } = payload;
  const dayLabelHe = HEBREW_DAYS[dayOfParasha - 1] ?? `יום ${dayOfParasha}`;
  const dayPossessiveHe =
    HEBREW_DAY_POSSESSIVES[dayOfParasha - 1] ?? "פסוק היום";

  const today = new Date();
  const dateLabel = today.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const description = parasha.descriptionHe || parasha.description;

  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 pt-8 sm:pt-12">
      <header className="mb-8 space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-fg-muted text-sm font-medium tracking-wide">
            {dateLabel}
          </p>
          <p className="text-fg-muted text-xs whitespace-nowrap">
            יום {hebrewNumeral(dayOfParasha)} מתוך ז׳
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
        <div className="flex flex-col">
          <p className="text-fg-muted text-xs tracking-widest">
            {dayPossessiveHe}
          </p>
          <p className="he text-sm text-fg-muted mt-0.5" lang="he" dir="rtl">
            {dayLabelHe}
          </p>
        </div>
        <span
          className="he text-sm px-2.5 py-1.5 rounded-md border border-rule/60 text-fg-muted self-start"
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
