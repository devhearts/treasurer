import type { CeremonyEvent, MilestoneItem } from "@/lib/types";
import { formatCalendarDate, formatUGX, getEventTypeLabel } from "@/lib/data";

export function publicEventPath(slug: string): string {
  return `/events/${encodeURIComponent(slug)}`;
}

/** Public contribute URL with milestone pre-selected (`allocateTo` query). */
export function publicMilestoneContributePath(
  slug: string,
  milestoneId: string
): string {
  const base = publicEventPath(slug);
  const q = new URLSearchParams({ allocateTo: milestoneId });
  return `${base}?${q.toString()}`;
}

export function absoluteMilestoneContributeUrl(
  slug: string,
  milestoneId: string
): string {
  return `${siteBaseUrl()}${publicMilestoneContributePath(slug, milestoneId)}`;
}

/** If `allocateTo` matches a milestone on the event, return its id; else undefined. */
export function resolveAllocateToMilestoneId(
  event: CeremonyEvent,
  allocateTo: string | undefined | null
): string | undefined {
  const id = allocateTo?.trim();
  if (!id) return undefined;
  return event.milestoneItems.some((m) => m.id === id) ? id : undefined;
}

export function buildMilestoneContributeShareBlurb(
  event: CeremonyEvent,
  milestone: MilestoneItem,
  absoluteUrl: string
): string {
  const title = event.title.trim() || "this event";
  return (
    `Support "${milestone.name}" for ${title} on CeremonyWallet.\n\n` +
    `Contribute here:\n${absoluteUrl}`
  );
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

/**
 * Same-origin path for a public gallery slot (must match API `galleryPublicUrls` order).
 * Always derive from `event.slug` — do not trust the first `imageUrls[]` string, which can
 * be stale or wrong across navigations/caches and breaks OG / list thumbnails.
 */
export function publicEventGallerySlotPath(
  slug: string,
  slot: number
): string {
  return `/api/v1/events/by-slug/${encodeURIComponent(slug)}/gallery/${slot}`;
}

/** First gallery image path for lists (`<img src>`); same-origin `/api/v1/.../gallery/0`. */
export function firstEventImageSrc(event: CeremonyEvent): string | undefined {
  if (!event.imageUrls?.length) return undefined;
  return publicEventGallerySlotPath(event.slug, 0);
}

/** Absolute URL for OG / Twitter cards (crawlers cannot use relative paths). */
export function absoluteFirstEventImageUrl(
  event: CeremonyEvent
): string | undefined {
  const rel = firstEventImageSrc(event);
  if (!rel) return undefined;
  const base = siteBaseUrl();
  /** Per-event cache buster so link-preview CDNs never reuse another event’s image at `/gallery/0`. */
  const v = encodeURIComponent(event.id);
  return `${base}${rel}?v=${v}`;
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
  out += ` · ${when}`;
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
