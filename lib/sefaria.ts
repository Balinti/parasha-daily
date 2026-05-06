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

/** Strip Sefaria's HTML tags (footnotes, etc.) so we can render plain text. */
export function stripHtml(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "") // footnote markers
    .replace(/<i[^>]*class="footnote"[^>]*>.*?<\/i>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
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
