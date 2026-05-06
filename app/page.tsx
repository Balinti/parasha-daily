import { getTodayPayload } from "@/lib/today";
import StreakBadge from "@/components/StreakBadge";
import CommentaryCard from "@/components/CommentaryCard";

export const revalidate = 3600; // 1h ISR

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

/** Convert a number (1-9) to a Hebrew letter for "Day א מתוך ז" */
function hebrewNumeral(n: number): string {
  const letters = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז"];
  return letters[n] ?? String(n);
}

export default async function Home() {
  let payload;
  try {
    payload = await getTodayPayload();
  } catch (err) {
    return (
      <main className="flex-1 grid place-items-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-semibold">לא ניתן לטעון את פרשת השבוע</h1>
          <p className="text-fg-muted text-sm">
            ייתכן ששרתי ספריא אינם זמינים כרגע. נסו שוב בעוד רגע.
          </p>
          <pre className="text-xs text-fg-muted/70 mt-4 ltr text-left" dir="ltr">
            {err instanceof Error ? err.message : String(err)}
          </pre>
        </div>
      </main>
    );
  }

  const { parasha, dayOfParasha, verse, rashi } = payload;
  const dayLabelHe = HEBREW_DAYS[dayOfParasha - 1] ?? `יום ${dayOfParasha}`;
  const dayPossessiveHe =
    HEBREW_DAY_POSSESSIVES[dayOfParasha - 1] ?? "פסוק היום";

  const today = new Date();
  // Hebrew Gregorian date: "יום רביעי, 6 במאי 2026"
  const dateLabel = today.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const description = parasha.descriptionHe || parasha.description;

  return (
    <main className="flex-1 parchment">
      <div className="mx-auto max-w-2xl px-5 pb-24 pt-8 sm:pt-12">
        {/* Top: date */}
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
            <p className="text-fg-muted text-xs tracking-widest">
              פרשת השבוע
            </p>
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

        {/* Day banner */}
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

        {/* Verse card */}
        <article
          className="rounded-3xl border border-rule/60 bg-bg-elev p-6 sm:p-8 shadow-sm"
          aria-labelledby="verse-heading"
        >
          <h2 id="verse-heading" className="sr-only">
            הפסוק של היום: {verse.refHe || verse.ref}
          </h2>

          {verse.he && (
            <p
              className="he text-[1.45rem] sm:text-[1.7rem] leading-loose text-fg mb-5"
              lang="he"
              dir="rtl"
            >
              {verse.he}
            </p>
          )}

          {verse.en && (
            <p
              className="text-fg-muted text-[0.95rem] leading-relaxed pt-4 border-t border-rule/50"
              lang="en"
              dir="ltr"
            >
              {verse.en}
            </p>
          )}
        </article>

        {/* Commentary */}
        <section className="mt-6 space-y-4">
          <CommentaryCard title="רש״י" he={rashi.he} en={rashi.en} />
        </section>

        {/* Streak action */}
        <section className="mt-8 space-y-3">
          <StreakBadge />
          <p className="text-fg-muted text-sm text-center">
            חמש דקות ביום. כל הפרשה בשבוע.
          </p>
        </section>

        {/* Footer */}
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
    </main>
  );
}
