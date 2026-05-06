"use client";

import { useState } from "react";

type Props = {
  title: string;
  he: string;
  /** Kept in the API for parity but ignored — UI is Hebrew-only. */
  en?: string;
};

export default function CommentaryCard({ title, he }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!he.trim()) {
    return (
      <div className="rounded-2xl border border-rule/50 bg-bg-elev p-5">
        <h3
          className="font-semibold text-base tracking-wide"
          lang="he"
          dir="rtl"
          style={{ color: "var(--accent)" }}
        >
          {title}
        </h3>
        <p className="mt-2 text-fg-muted text-sm" lang="he" dir="rtl">
          אין פירוש זמין לפסוק זה.
        </p>
      </div>
    );
  }

  const previewLen = 320;
  const text = expanded || he.length <= previewLen ? he : he.slice(0, previewLen) + "…";
  const canExpand = he.length > previewLen;

  return (
    <div className="rounded-2xl border border-rule/60 bg-bg-elev p-5 shadow-sm">
      <div className="mb-4">
        <h3
          className="font-semibold text-base tracking-wide"
          lang="he"
          dir="rtl"
          style={{ color: "var(--accent)" }}
        >
          {title}
        </h3>
      </div>

      <p
        className="he text-[1.05rem] leading-loose text-fg"
        lang="he"
        dir="rtl"
      >
        {text}
      </p>

      {canExpand && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-sm font-medium text-accent hover:underline"
        >
          {expanded ? "הצג פחות" : "קרא את הפירוש המלא"}
        </button>
      )}
    </div>
  );
}
