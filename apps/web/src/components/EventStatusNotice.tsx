"use client";

import type { PublicStatusNotice } from "@/lib/event-lifecycle";

interface EventStatusNoticeProps {
  notice: PublicStatusNotice;
  /** `hero` — dark event header on public pages (replaces Contribute CTA). */
  variant?: "default" | "hero";
  className?: string;
}

export default function EventStatusNotice({
  notice,
  variant = "default",
  className = "",
}: EventStatusNoticeProps) {
  const title =
    notice.kind === "stopped"
      ? "Event ended"
      : notice.kind === "paused"
        ? "Contributions paused"
        : "Event unavailable";

  const borderClass =
    variant === "hero"
      ? notice.kind === "suspended"
        ? "border-red-300/40 bg-red-500/15"
        : notice.kind === "stopped"
          ? "border-light/25 bg-light/10"
          : "border-amber-400/45 bg-amber-500/15"
      : notice.kind === "suspended"
        ? "border-red-200 bg-red-50"
        : notice.kind === "stopped"
          ? "border-muted/40 bg-muted/10"
          : "border-amber-200 bg-amber-50";

  const titleClass =
    variant === "hero"
      ? "text-light/75"
      : "text-muted";

  const messageClass =
    variant === "hero" ? "text-light" : "text-surface";

  return (
    <div
      className={`rounded-xl border p-4 ${borderClass} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide mb-1 ${titleClass}`}
      >
        {title}
      </p>
      <p
        className={`text-sm leading-relaxed whitespace-pre-wrap ${messageClass}`}
      >
        {notice.message}
      </p>
    </div>
  );
}
