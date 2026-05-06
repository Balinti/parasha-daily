"use client";

import { useState } from "react";

type Props = {
  title: string;
  he: string;
  en: string;
};

type Lang = "en" | "he" | "both";

export default function CommentaryCard({ title, he, en }: Props) {
  const [lang, setLang] = useState<Lang>("he");
  const [expanded, setExpanded] = useState(false);

  const hasHe = he.trim().length > 0;
  const hasEn = en.trim().length > 0;

  if (!hasHe && !hasEn) {
    return (
      <div className="rounded-2xl border border-rule/50 bg-bg-elev p-5">
        <h3 className="font-semibold text-fg-muted text-sm tracking-wide">
          {title}
        </h3>
        <p className="mt-2 text-fg-muted text-sm">
          אין פירוש זמין לפסוק זה.
        </p>
      </div>
    );
  }

  const showHe = (lang === "he" || lang === "both") && hasHe;
  const showEn = (lang === "en" || lang === "both") && hasEn;

  const enPreviewLen = 360;
  const hePreviewLen = 320;
  const enText = expanded || en.length <= enPreviewLen ? en : en.slice(0, enPreviewLen) + "…";
  const heText = expanded || he.length <= hePreviewLen ? he : he.slice(0, hePreviewLen) + "…";
  const canExpand = en.length > enPreviewLen || he.length > hePreviewLen;

  return (
    <div className="rounded-2xl border border-rule/60 bg-bg-elev p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <h3
          className="font-semibold text-fg text-base tracking-wide"
          lang="he"
          dir="rtl"
          style={{ color: "var(--accent)" }}
        >
          {title}
        </h3>
        <div className="flex items-center gap-1.5 text-xs">
          {hasHe && hasEn && (
            <>
              <LangButton active={lang === "both"} onClick={() => setLang("both")}>
                שניהם
              </LangButton>
              <LangButton active={lang === "he"} onClick={() => setLang("he")}>
                עברית
              </LangButton>
              <LangButton active={lang === "en"} onClick={() => setLang("en")}>
                אנגלית
              </LangButton>
            </>
          )}
        </div>
      </div>

      {showHe && (
        <p
          className="he text-[1.05rem] leading-loose text-fg mb-3"
          lang="he"
          dir="rtl"
        >
          {heText}
        </p>
      )}
      {showEn && (
        <p
          className="text-fg-muted leading-relaxed text-[0.95rem]"
          lang="en"
          dir="ltr"
        >
          {enText}
        </p>
      )}

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

function LangButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-md transition-colors"
      style={{
        background: active
          ? "color-mix(in oklab, var(--accent) 22%, transparent)"
          : "color-mix(in oklab, var(--fg) 8%, transparent)",
        color: active ? "var(--accent)" : "var(--fg)",
        fontWeight: active ? 700 : 600,
      }}
    >
      {children}
    </button>
  );
}
