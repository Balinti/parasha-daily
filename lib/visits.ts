import { israelTimeParts } from "./today";

/**
 * Anonymous visit counting via Abacus (https://abacus.jasoncameron.dev) —
 * a free hit-counter API that needs no account. No cookies, no personal data:
 * we only increment named counters.
 *
 *   visitors        +1 the first time a browser ever opens the app
 *   day-YYYY-MM-DD  +1 the first time a browser opens the app on that
 *                   Asia/Jerusalem day (= daily unique visitors)
 */
const API = "https://abacus.jasoncameron.dev";
export const VISITS_NAMESPACE = "parasha-daily-balinti";
export const TOTAL_KEY = "visitors";

const SEEN_EVER = "parasha-daily.visit.ever";
const SEEN_DAY = "parasha-daily.visit.day";

export function dayKey(dateKey: string): string {
  return `day-${dateKey}`;
}

async function hit(key: string): Promise<void> {
  await fetch(`${API}/hit/${VISITS_NAMESPACE}/${key}`);
}

/** Read a counter; a key that was never hit counts as 0. */
export async function getCount(key: string): Promise<number> {
  const res = await fetch(`${API}/get/${VISITS_NAMESPACE}/${key}`);
  if (res.status === 404) return 0;
  if (!res.ok) throw new Error(`Abacus ${res.status}`);
  const data = (await res.json()) as { value?: number };
  return typeof data.value === "number" ? data.value : 0;
}

/** Count this browser once ever and once per Israel day. Never throws. */
export async function recordVisit(): Promise<void> {
  try {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return;
    // The stats page is the owner looking at numbers, not a learner.
    if (window.location.pathname.includes("/stats")) return;

    const today = israelTimeParts().dateKey;
    if (!window.localStorage.getItem(SEEN_EVER)) {
      await hit(TOTAL_KEY);
      window.localStorage.setItem(SEEN_EVER, today);
    }
    if (window.localStorage.getItem(SEEN_DAY) !== today) {
      await hit(dayKey(today));
      window.localStorage.setItem(SEEN_DAY, today);
    }
  } catch {
    /* counting must never break the app */
  }
}
