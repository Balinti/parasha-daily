"use client";

import { useEffect, useState } from "react";
import { israelTimeParts } from "@/lib/today";
import { TOTAL_KEY, dayKey, getCount } from "@/lib/visits";

const DAYS = 14;

type Row = { date: string; count: number };

export default function StatsPage() {
  const [total, setTotal] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const now = Date.now();
        const dates = Array.from(
          { length: DAYS },
          (_, i) => israelTimeParts(new Date(now - i * 86400000)).dateKey,
        );
        const [t, ...counts] = await Promise.all([
          getCount(TOTAL_KEY),
          ...dates.map((d) => getCount(dayKey(d))),
        ]);
        setTotal(t);
        setRows(dates.map((date, i) => ({ date, count: counts[i] })));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, []);

  return (
    <main className="flex-1 parchment" dir="ltr" lang="en">
      <div className="mx-auto max-w-md px-5 py-12 font-sans">
        <h1 className="text-2xl font-semibold">Parasha Daily — visitors</h1>
        <p className="text-fg-muted text-sm mt-1">
          Unique browsers. Days are Israel time.
        </p>

        {error && <p className="mt-6 text-sm">Couldn&apos;t load: {error}</p>}

        {total !== null && (
          <>
            <p className="mt-8 text-5xl font-semibold text-accent">{total}</p>
            <p className="text-fg-muted text-sm">total unique visitors</p>

            <table className="mt-8 w-full text-sm">
              <thead>
                <tr className="text-fg-muted text-left border-b border-rule">
                  <th className="py-2 font-medium">Day</th>
                  <th className="py-2 font-medium text-right">Visitors</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.date} className="border-b border-rule/50">
                    <td className="py-2 font-mono">{r.date}</td>
                    <td className="py-2 text-right tabular-nums">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </main>
  );
}
