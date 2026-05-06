"use client";

import { useEffect, useState } from "react";

type StreakState = {
  /** Last date the user marked "learned" (YYYY-MM-DD, local) */
  lastDate: string | null;
  /** Consecutive days streak */
  streak: number;
  /** Total verses learned, all time */
  total: number;
};

const KEY = "parasha-daily.streak.v1";

function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function yesterdayKey(d = new Date()): string {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return todayKey(y);
}

function loadState(): StreakState {
  if (typeof window === "undefined") {
    return { lastDate: null, streak: 0, total: 0 };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { lastDate: null, streak: 0, total: 0 };
    const parsed = JSON.parse(raw) as StreakState;
    return {
      lastDate: parsed.lastDate ?? null,
      streak: typeof parsed.streak === "number" ? parsed.streak : 0,
      total: typeof parsed.total === "number" ? parsed.total : 0,
    };
  } catch {
    return { lastDate: null, streak: 0, total: 0 };
  }
}

function saveState(s: StreakState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore quota errors */
  }
}

export default function StreakBadge() {
  const [state, setState] = useState<StreakState>({
    lastDate: null,
    streak: 0,
    total: 0,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  const today = todayKey();
  const learnedToday = state.lastDate === today;

  const onMarkLearned = () => {
    const yesterday = yesterdayKey();
    let nextStreak: number;
    if (state.lastDate === today) {
      return; // already done today
    }
    if (state.lastDate === yesterday) {
      nextStreak = state.streak + 1;
    } else if (state.lastDate === null) {
      nextStreak = 1;
    } else {
      // gap → reset
      nextStreak = 1;
    }
    const next: StreakState = {
      lastDate: today,
      streak: nextStreak,
      total: state.total + 1,
    };
    setState(next);
    saveState(next);
  };

  if (!hydrated) {
    // Avoid hydration mismatch; render placeholder
    return (
      <div className="flex items-center gap-3 text-sm text-fg-muted">
        <span className="inline-block w-12 h-6 rounded bg-rule/40" />
      </div>
    );
  }

  // Hebrew pluralization helpers
  const daysLabel =
    state.streak === 0
      ? "0 ימים"
      : state.streak === 1
        ? "יום אחד"
        : state.streak === 2
          ? "יומיים"
          : `${state.streak} ימים`;

  const versesLabel =
    state.total === 0
      ? "טרם נלמדו פסוקים"
      : state.total === 1
        ? "פסוק אחד נלמד"
        : state.total === 2
          ? "שני פסוקים נלמדו"
          : `${state.total} פסוקים נלמדו`;

  return (
    <div className="flex flex-col items-stretch gap-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium"
            style={{
              background: "color-mix(in oklab, var(--accent) 14%, transparent)",
              color: "var(--accent)",
            }}
          >
            <FlameIcon />
            <span>{daysLabel}</span>
          </span>
          <span className="text-fg-muted">{versesLabel}</span>
        </div>
      </div>

      <button
        onClick={onMarkLearned}
        disabled={learnedToday}
        className="w-full px-4 py-3 rounded-xl font-semibold transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-default"
        style={{
          background: learnedToday
            ? "color-mix(in oklab, var(--accent) 16%, transparent)"
            : "var(--accent)",
          color: learnedToday ? "var(--accent)" : "var(--bg)",
          boxShadow: learnedToday
            ? "none"
            : "0 1px 0 0 color-mix(in oklab, var(--accent) 60%, black) inset, 0 8px 24px -12px var(--accent)",
        }}
      >
        {learnedToday ? "✓ למדת היום — נתראה מחר" : "סיימתי ללמוד"}
      </button>
    </div>
  );
}

function FlameIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2c.3 3.5-2 5-2 7.5A2.5 2.5 0 0 0 12.5 12c1.4 0 2.5-1 2.5-2.5C15 12 18 13 18 16a6 6 0 1 1-12 0c0-2.6 1.5-4.4 3-6 1.5-1.6 3-3.4 3-8z" />
    </svg>
  );
}
