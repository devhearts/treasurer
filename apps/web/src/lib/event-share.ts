import type { CeremonyEvent } from "@/lib/types";
import { formatCalendarDate, formatUGX, getEventTypeLabel } from "@/lib/data";

export function publicEventPath(slug: string): string {
  return `/events/${encodeURIComponent(slug)}`;
}

/** Public site base for OG / canonical URLs (no trailing slash). */
export function siteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  return "http://localhost:3000";
}

export function absolutePublicEventUrl(slug: string): string {
  return `${siteBaseUrl()}${publicEventPath(slug)}`;
}

/** Tab title / share sheet title (kept reasonably short). */
export function eventShareTitle(event: CeremonyEvent): string {
  const suffix = " · CeremonyWallet";
  const max = 72 - suffix.length;
  const t = event.title.trim() || "Ceremony";
  const head = t.length <= max ? t : `${t.slice(0, Math.max(1, max - 1))}…`;
  return `${head}${suffix}`;
}

/**
 * Multi-line message for clipboard and apps that only read `text` (SMS, some share targets).
 * Always ends with the public event URL on its own last line(s).
 */
export function buildEventShareBlurb(
  event: CeremonyEvent,
  absoluteUrl: string
): string {
  const type = getEventTypeLabel(event.type);
  const when = formatCalendarDate(event.date, "long");
  const loc = event.location.trim();
  let out = `${event.title.trim()}\n`;
  out += `${type}`;
  if (loc) out += ` · ${loc}`;
  out += ` · ${when}\n`;
  out += `${formatUGX(event.raisedAmount)} raised`;
  if (event.targetAmount > 0) {
    out += ` · goal ${formatUGX(event.targetAmount)}`;
  }
  const desc = event.description.trim();
  if (desc) {
    const short = desc.length > 200 ? `${desc.slice(0, 197)}…` : desc;
    out += `\n\n${short}`;
  }
  out += `\n\nContribute or follow along (CeremonyWallet):\n${absoluteUrl}`;
  return out;
}

/** Open Graph / Twitter description (single line, length-capped). */
export function buildEventOgDescription(
  event: CeremonyEvent,
  maxLen = 200
): string {
  const type = getEventTypeLabel(event.type);
  const loc = event.location.trim() || "Uganda";
  const when = formatCalendarDate(event.date, "short");
  let s = `${type} · ${loc} · ${when}. `;
  if (event.targetAmount > 0) {
    s += `${formatUGX(event.raisedAmount)} raised toward ${formatUGX(event.targetAmount)}.`;
  } else {
    s += `${formatUGX(event.raisedAmount)} raised.`;
  }
  const org = event.organizer.trim();
  if (org) s += ` Organizer: ${org}.`;
  const desc = event.description.trim();
  if (desc) {
    const extra = desc.length > 90 ? `${desc.slice(0, 87)}…` : desc;
    s += ` ${extra}`;
  }
  return s.length <= maxLen ? s : `${s.slice(0, Math.max(1, maxLen - 1))}…`;
}
