/**
 * Sefaria API client.
 * Docs: https://developers.sefaria.org/
 *
 * We use:
 * - GET /api/calendars                        -> get today's parasha
 * - GET /api/v3/texts/{ref}?version=...        -> Hebrew + English text
 * - GET /api/v3/texts/Rashi%20on%20{ref}       -> Rashi commentary
 */

const BASE = "https://www.sefaria.org/api";

export type ParashaInfo = {
  /** English name, e.g. "Behar-Bechukotai" */
  name: string;
  /** Hebrew name, e.g. "בְּהַר-בְּחֻקֹּתַי" */
  nameHe: string;
  /** Full ref, e.g. "Leviticus 25:1-27:34" */
  ref: string;
  /** English short description */
  description?: string;
  /** Hebrew short description */
  descriptionHe?: string;
  /** Aliyot refs, ordered (1..7), if available */
  aliyot?: string[];
};

export type VerseRef = {
  /** e.g. "Leviticus 25:1" */
  ref: string;
  /** e.g. "ויקרא כ״ה:א׳" */
  refHe?: string;
  /** Hebrew text (vocalized) */
  he: string;
  /** English text */
  en: string;
};

export type Commentary = {
  /** Hebrew text of the commentary, joined */
  he: string;
  /** English text of the commentary, joined */
  en: string;
};

type CalendarItem = {
  title: { en: string; he: string };
  displayValue: { en: string; he: string };
  ref: string;
  category: string;
  description?: { en: string; he: string };
  extraDetails?: { aliyot?: string[] };
};

type CalendarsResponse = {
  date: string;
  calendar_items: CalendarItem[];
};

/**
 * Browser-safe fetch helper. Uses standard cache: 'force-cache' so repeat
 * calls in the same session are served from the HTTP cache.
 */
async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Sefaria ${res.status}: ${url}`);
  }
  return (await res.json()) as T;
}

/**
 * Strip Sefaria's HTML tags (footnotes, etc.) and decode common HTML entities
 * — even with `return_format=text_only`, Sefaria still leaks a few entities
 * like `&thinsp;` (typographic thin space, often before paseq `׀`).
 */
const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  thinsp: " ", // thin space
  ensp: " ",
  emsp: " ",
  zwj: "‍",
  zwnj: "‌",
  shy: "­",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
};

export function stripHtml(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "") // footnote markers
    .replace(/<i[^>]*class="footnote"[^>]*>.*?<\/i>/gi, "")
    .replace(/<[^>]+>/g, "")
    // Decode numeric entities: &#39; &#x2009; etc.
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    // Decode named entities we expect, drop any others.
    .replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (_, name) => {
      return NAMED_ENTITIES[name] ?? "";
    })
    .trim();
}

/** Fetch today's parasha from Sefaria's calendar API. */
export async function getTodaysParasha(): Promise<ParashaInfo> {
  const data = await getJson<CalendarsResponse>(`${BASE}/calendars`);
  const item = data.calendar_items.find(
    (i) => i.title?.en === "Parashat Hashavua",
  );
  if (!item) {
    throw new Error("No Parashat Hashavua found in calendar response");
  }
  return {
    name: item.displayValue.en,
    nameHe: item.displayValue.he,
    ref: item.ref,
    description: item.description?.en,
    descriptionHe: item.description?.he,
    aliyot: item.extraDetails?.aliyot,
  };
}

type V3TextResponse = {
  versions: Array<{
    text: string | string[];
    language: string;
    languageFamilyName?: string;
    direction?: "rtl" | "ltr";
    versionTitle?: string;
  }>;
  ref: string;
  heRef?: string;
};

function flattenText(text: string | string[] | unknown): string {
  if (Array.isArray(text)) {
    return text
      .map((t) => (Array.isArray(t) ? flattenText(t) : String(t ?? "")))
      .filter(Boolean)
      .join(" ");
  }
  return String(text ?? "");
}

/** Fetch a verse with Hebrew + English. */
export async function getVerse(ref: string): Promise<VerseRef> {
  const url = `${BASE}/v3/texts/${encodeURIComponent(ref)}?version=hebrew&version=english&return_format=text_only`;
  const data = await getJson<V3TextResponse>(url);

  const hebrew = data.versions.find(
    (v) => v.languageFamilyName === "Hebrew" || v.language === "he",
  );
  const english = data.versions.find(
    (v) => v.languageFamilyName === "English" || v.language === "en",
  );

  return {
    ref: data.ref,
    refHe: data.heRef,
    he: stripHtml(flattenText(hebrew?.text)),
    en: stripHtml(flattenText(english?.text)),
  };
}

/**
 * List every verse in `rangeRef` that has at least one direct Rashi comment.
 *
 * Fetches "Rashi on <range>" in one call (~30-50KB for a full parasha) and
 * walks the nested text array to find non-empty entries. The returned refs are
 * in canonical order (chapter, verse ascending). Empty list means no Rashi
 * exists anywhere in the range.
 */
export async function listVersesWithRashi(rangeRef: string): Promise<string[]> {
  const url = `${BASE}/v3/texts/${encodeURIComponent(
    "Rashi on " + rangeRef,
  )}?version=hebrew&return_format=text_only`;

  type RashiResp = {
    versions?: Array<{ text?: unknown }>;
    sections?: string[];
  };
  let data: RashiResp;
  try {
    data = await getJson<RashiResp>(url);
  } catch {
    return [];
  }

  // Hebrew version preferred (Rashi authored in Hebrew); fallback to first.
  const text =
    (data.versions ?? []).find((v) =>
      Array.isArray((v as { text?: unknown }).text),
    )?.text ?? data.versions?.[0]?.text;

  if (!Array.isArray(text)) return [];

  // Parse "Book ch:v-ch:v" or "Book ch:v-v"
  const m = rangeRef.match(
    /^(.+?)\s+(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/,
  );
  if (!m) return [];
  const book = m[1];
  const startCh = parseInt(m[2], 10);
  const startV = parseInt(m[3], 10);

  const verseHasRashi = (entry: unknown): boolean => {
    if (Array.isArray(entry)) {
      return entry.some(
        (item) =>
          (typeof item === "string" && item.trim().length > 0) ||
          (Array.isArray(item) && verseHasRashi(item)),
      );
    }
    return typeof entry === "string" && entry.trim().length > 0;
  };

  const refs: string[] = [];
  for (let chIdx = 0; chIdx < text.length; chIdx++) {
    const chapter = text[chIdx];
    if (!Array.isArray(chapter)) continue;
    const actualCh = startCh + chIdx;
    for (let vIdx = 0; vIdx < chapter.length; vIdx++) {
      if (!verseHasRashi(chapter[vIdx])) continue;
      // text[0] starts at startV; subsequent chapters start at verse 1.
      const actualV = chIdx === 0 ? startV + vIdx : vIdx + 1;
      refs.push(`${book} ${actualCh}:${actualV}`);
    }
  }
  return refs;
}

/** Fetch Rashi (or any commentator) on a verse. */
export async function getCommentary(
  commentator: string,
  ref: string,
): Promise<Commentary> {
  // e.g. "Rashi on Leviticus 25:1"
  const fullRef = `${commentator} on ${ref}`;
  const url = `${BASE}/v3/texts/${encodeURIComponent(fullRef)}?version=hebrew&version=english&return_format=text_only`;
  try {
    const data = await getJson<V3TextResponse>(url);
    const hebrew = data.versions.find(
      (v) => v.languageFamilyName === "Hebrew" || v.language === "he",
    );
    const english = data.versions.find(
      (v) => v.languageFamilyName === "English" || v.language === "en",
    );
    return {
      he: stripHtml(flattenText(hebrew?.text)),
      en: stripHtml(flattenText(english?.text)),
    };
  } catch {
    // Some verses have no Rashi — return empty rather than failing.
    return { he: "", en: "" };
  }
}
