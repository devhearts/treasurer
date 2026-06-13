"use client";

import type { PublicStatusNotice } from "@/lib/event-lifecycle";

interface EventStatusNoticeProps {
  notice: PublicStatusNotice;
}

export default function EventStatusNotice({ notice }: EventStatusNoticeProps) {
  const title =
    notice.kind === "stopped"
      ? "Event ended"
      : notice.kind === "paused"
        ? "Contributions paused"
        : "Event unavailable";

  const borderClass =
    notice.kind === "suspended"
      ? "border-red-200 bg-red-50"
      : notice.kind === "stopped"
        ? "border-muted/40 bg-muted/10"
        : "border-amber-200 bg-amber-50";

  return (
    <div
      className={`rounded-xl border p-4 ${borderClass}`}
      role="status"
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">
        {title}
      </p>
      <p className="text-sm text-surface leading-relaxed whitespace-pre-wrap">
        {notice.message}
      </p>
    </div>
  );
}
