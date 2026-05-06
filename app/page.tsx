import { getTodayPayload } from "@/lib/today";
import StreakBadge from "@/components/StreakBadge";
import CommentaryCard from "@/components/CommentaryCard";

export const revalidate = 3600; // 1h ISR

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Shabbat",
];

const HEBREW_DAYS = [
  "יום ראשון",
  "יום שני",
  "יום שלישי",
  "יום רביעי",
  "יום חמישי",
  "יום שישי",
  "שבת קודש",
];

export default async function Home() {
  let payload;
  try {
    payload = await getTodayPayload();
  } catch (err) {
    return (
      <main className="flex-1 grid place-items-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-semibold">
            Couldn&apos;t load today&apos;s parasha
          </h1>
          <p className="text-fg-muted text-sm">
            Sefaria&apos;s servers may be down. Please try again in a moment.
          </p>
          <pre className="text-xs text-fg-muted/70 mt-4">
            {err instanceof Error ? err.message : String(err)}
          </pre>
        </div>
      </main>
    );
  }

  const { parasha, dayOfParasha, verse, rashi } = payload;
  const dayLabel = DAY_NAMES[dayOfParasha - 1] ?? `Day ${dayOfParasha}`;
  const dayLabelHe = HEBREW_DAYS[dayOfParasha - 1] ?? "";

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="flex-1 parchment">
      <div className="mx-auto max-w-2xl px-5 pb-24 pt-8 sm:pt-12">
        {/* Top: date */}
        <header className="mb-8 space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-fg-muted text-sm font-medium tracking-wide uppercase">
              {dateLabel}
            </p>
            <p className="text-fg-muted text-xs">Day {dayOfParasha} of 7</p>
          </div>

          <div>
            <p className="text-fg-muted text-xs uppercase tracking-widest">
              This week&apos;s Parasha
            </p>
            <h1
              className="he-display text-4xl sm:text-5xl mt-1"
              lang="he"
              dir="rtl"
              style={{ color: "var(--accent)" }}
            >
              {parasha.nameHe}
            </h1>
            <p className="text-fg font-medium mt-1">{parasha.name}</p>
            {parasha.description && (
              <p className="text-fg-muted text-sm mt-2 leading-relaxed">
                {parasha.description}
              </p>
            )}
          </div>
        </header>

        <div className="fancy-rule mb-8" />

        {/* Day banner */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <p className="text-fg-muted text-xs uppercase tracking-widest">
              {dayLabel}&apos;s verse
            </p>
            <p className="he text-sm text-fg-muted mt-0.5" lang="he" dir="rtl">
              {dayLabelHe}
            </p>
          </div>
          <span
            className="text-xs font-mono px-2.5 py-1.5 rounded-md border border-rule/60 text-fg-muted self-start"
            title="Verse reference"
          >
            {verse.ref}
          </span>
        </div>

        {/* Verse card */}
        <article
          className="rounded-3xl border border-rule/60 bg-bg-elev p-6 sm:p-8 shadow-sm"
          aria-labelledby="verse-heading"
        >
          <h2 id="verse-heading" className="sr-only">
            Today&apos;s verse: {verse.ref}
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
            <p className="text-fg text-[1.05rem] leading-relaxed">
              {verse.en}
            </p>
          )}

          {verse.refHe && (
            <p
              className="he text-xs text-fg-muted mt-5 pt-4 border-t border-rule/50 text-right"
              lang="he"
              dir="rtl"
            >
              {verse.refHe}
            </p>
          )}
        </article>

        {/* Commentary */}
        <section className="mt-6 space-y-4">
          <CommentaryCard title="Rashi" he={rashi.he} en={rashi.en} />
        </section>

        {/* Streak action */}
        <section className="mt-8 space-y-3">
          <StreakBadge />
          <p className="text-fg-muted text-sm text-center">
            Five minutes a day. The whole parasha in seven.
          </p>
        </section>

        {/* Footer */}
        <footer className="mt-14 text-center space-y-2">
          <div className="fancy-rule" />
          <p className="text-fg text-sm pt-4 opacity-80">
            Texts &amp; commentary courtesy of{" "}
            <a
              href={`https://www.sefaria.org/${encodeURIComponent(
                verse.ref.replace(/\s+/g, "_"),
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-accent/60 hover:text-accent"
            >
              Sefaria
            </a>
            . Open source.
          </p>
        </footer>
      </div>
    </main>
  );
}
