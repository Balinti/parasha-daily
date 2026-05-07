import type { ParashaInfo } from "@/lib/sefaria";

type Props = {
  parasha: ParashaInfo;
  dateLabel: string;
};

/**
 * Saturday (Shabbat) view — no daily lesson. The whole parasha is read in
 * shul today, so we just wish the user Shabbat shalom and bow out.
 */
export default function ShabbatScreen({ parasha, dateLabel }: Props) {
  const description = parasha.descriptionHe || parasha.description;

  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 pt-8 sm:pt-12" lang="he" dir="rtl">
      {/* Date banner */}
      <header className="mb-8 space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-fg-muted text-sm font-medium tracking-wide">
            {dateLabel}
          </p>
          <p className="text-fg-muted text-xs whitespace-nowrap">
            יום מנוחה
          </p>
        </div>

        <div>
          <p className="text-fg-muted text-xs tracking-widest">פרשת השבוע</p>
          <h1
            className="he-display text-4xl sm:text-5xl mt-1"
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

      <div className="fancy-rule mb-10" />

      {/* The hero Shabbat card */}
      <article
        className="rounded-3xl border border-rule/60 bg-bg-elev px-6 py-12 sm:px-10 sm:py-16 text-center shadow-sm relative overflow-hidden"
        aria-labelledby="shabbat-heading"
      >
        <CandlesIcon className="mx-auto mb-6 text-accent" />
        <h2
          id="shabbat-heading"
          className="he-display text-5xl sm:text-6xl"
          style={{ color: "var(--accent)" }}
        >
          שבת שלום
        </h2>
        <p className="mt-6 text-fg text-lg leading-relaxed max-w-md mx-auto">
          היום יום מנוחה. אין שיעור יומי בשבת.
        </p>
        <p className="mt-3 text-fg-muted text-base leading-relaxed max-w-md mx-auto">
          את הפרשה כולה קוראים היום בבית הכנסת.
          <br />
          השיעור היומי חוזר במוצאי שבת.
        </p>
      </article>

      <footer className="mt-14 text-center space-y-2">
        <div className="fancy-rule" />
        <p className="text-fg text-sm pt-4 opacity-80">
          הטקסטים והפירושים באדיבות{" "}
          <a
            href={`https://www.sefaria.org/${encodeURIComponent(
              parasha.ref.replace(/\s+/g, "_"),
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

function CandlesIcon({ className }: { className?: string }) {
  // Two Shabbat candles; pure SVG so it scales with text color via currentColor.
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* Flames */}
      <path
        d="M24 14c0 3-2 4-2 7a3 3 0 0 0 6 0c0-3-4-3-4-7z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <path
        d="M48 14c0 3-2 4-2 7a3 3 0 0 0 6 0c0-3-4-3-4-7z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      {/* Candle bodies */}
      <rect x="22" y="26" width="6" height="22" rx="1" />
      <rect x="46" y="26" width="6" height="22" rx="1" />
      {/* Candlestick base */}
      <path d="M14 50 L58 50 L54 56 L18 56 Z" />
      <path d="M22 56 L50 56 L48 60 L24 60 Z" />
    </svg>
  );
}
