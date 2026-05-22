import { getEventTypeLabel } from "@/lib/data";
import type { CeremonyEvent } from "@/lib/types";
import type { InviteCardContent } from "./types";
import { defaultInviteFooter } from "./content-labels";

/** Display date on the card (e.g. "Saturday, 15 June 2026"). */
export function formatEventDateForCard(isoDate: string): string {
  const s = isoDate.trim();
  if (!s) return "";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? new Date(`${s}T12:00:00`)
    : new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-UG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Split "Venue, City" or multi-line location into venue + secondary line. */
export function parseEventLocation(location: string): {
  venue: string;
  locationLine: string;
} {
  const raw = location.trim();
  if (!raw) return { venue: "", locationLine: "" };
  const parts = raw
    .split(/[,;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    return { venue: parts[0] ?? "", locationLine: "" };
  }
  return { venue: parts[0], locationLine: parts.slice(1).join(", ") };
}

function namesFromEvent(event: CeremonyEvent): { name1: string; name2: string } {
  const parts = event.title.split(/\s*&\s*|\s+and\s+/i);
  const name1 = parts[0]?.trim() || event.organizer.trim() || "Host";
  const name2 = parts[1]?.trim() || "";
  return { name1, name2 };
}

function footerFromEvent(event: CeremonyEvent): string {
  const d = event.description.trim();
  if (d.length > 0 && d.length <= 120) return d;
  return defaultInviteFooter(event.type);
}

/** Full defaults for a new invitation from event details. */
export function buildDefaultInviteContentFromEvent(
  event: CeremonyEvent
): InviteCardContent {
  const { name1, name2 } = namesFromEvent(event);
  const { venue, locationLine } = parseEventLocation(event.location);
  const headline = getEventTypeLabel(event.type);

  return {
    name1,
    name2,
    headline,
    date: formatEventDateForCard(event.date),
    time: "",
    venue,
    location: locationLine,
    footer: footerFromEvent(event),
    font: "serif",
    accentColor: "#9A7432",
    rsvpEnabled: true,
    rsvpDeadline: event.date.trim().slice(0, 10) || undefined,
    rsvpNote: event.title.trim()
      ? `Please RSVP for ${event.title.trim()}.`
      : "Please respond at your earliest convenience.",
  };
}

export function defaultInvitationTitle(
  event: CeremonyEvent,
  content: InviteCardContent
): string {
  if (content.name2.trim()) {
    return `${content.name1} & ${content.name2}`;
  }
  return content.name1.trim() || event.title.trim() || "Invitation";
}

const EMPTY_OR_FACTORY: Partial<Record<keyof InviteCardContent, string>> = {
  headline: "Celebration",
  name1: "",
  name2: "",
  date: "",
  time: "",
  venue: "",
  location: "",
  footer: "",
};

function shouldFillField(
  key: keyof InviteCardContent,
  current: string | undefined
): boolean {
  const v = (current ?? "").trim();
  if (!v) return true;
  const factory = EMPTY_OR_FACTORY[key];
  return factory !== undefined && v === factory;
}

/** Fill blank (or factory-default) card fields from the event without overwriting edits. */
export function mergeEventIntoInviteContent(
  content: InviteCardContent,
  event: CeremonyEvent
): InviteCardContent {
  const defaults = buildDefaultInviteContentFromEvent(event);
  const next = { ...content };

  const keys: (keyof InviteCardContent)[] = [
    "name1",
    "name2",
    "headline",
    "date",
    "time",
    "venue",
    "location",
    "footer",
    "rsvpNote",
  ];

  for (const key of keys) {
    const cur = next[key];
    if (typeof cur === "string" && shouldFillField(key, cur)) {
      (next as Record<string, unknown>)[key] = defaults[key];
    }
  }

  if (!next.rsvpDeadline?.trim() && defaults.rsvpDeadline) {
    next.rsvpDeadline = defaults.rsvpDeadline;
  }

  return next;
}
