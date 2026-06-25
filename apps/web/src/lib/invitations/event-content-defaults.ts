import { getEventTypeLabel } from "@/lib/data";
import type { CeremonyEvent } from "@/lib/types";
import type { InviteCardContent, InviteTemplateId } from "./types";
import { defaultInviteFooter } from "./content-labels";
import {
  defaultPhotoUrlForEvent,
  eventHasGalleryPhoto,
} from "./invite-photo";
import {
  formatEventDateForCard,
  parseEventLocation,
} from "./invite-event-utils";
export { formatEventDateForCard, parseEventLocation } from "./invite-event-utils";
import {
  defaultTemplateForEvent,
  templateContentDefaults,
} from "./template-content-defaults";

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

/** Full defaults for a new invitation from event + template. */
export function buildDefaultInviteContentFromEvent(
  event: CeremonyEvent,
  templateId?: InviteTemplateId | string
): InviteCardContent {
  const resolvedTemplate = (templateId ??
    defaultTemplateForEvent(event.type)) as InviteTemplateId;
  const { name1, name2 } = namesFromEvent(event);
  const { venue, locationLine } = parseEventLocation(event.location);
  const headline = getEventTypeLabel(event.type, event.typeLabel);

  const shared: InviteCardContent = {
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
    ...(eventHasGalleryPhoto(event.imageUrls)
      ? { photoUrl: defaultPhotoUrlForEvent(event.slug) }
      : {}),
  };

  const templateLayer = templateContentDefaults(event, resolvedTemplate);

  return {
    ...shared,
    ...templateLayer,
    name1: templateLayer.name1 ?? shared.name1,
    name2: templateLayer.name2 ?? shared.name2,
    headline: templateLayer.headline ?? shared.headline,
    date: templateLayer.date ?? shared.date,
    venue: templateLayer.venue ?? shared.venue,
    location: templateLayer.location ?? shared.location,
    footer: templateLayer.footer ?? shared.footer,
    font: templateLayer.font ?? shared.font,
    accentColor: templateLayer.accentColor ?? shared.accentColor,
  };
}

export { defaultTemplateForEvent } from "./template-content-defaults";

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
  current: string | undefined,
  defaults: InviteCardContent
): boolean {
  const v = (current ?? "").trim();
  if (!v) return true;
  const fromDefaults = defaults[key];
  if (typeof fromDefaults === "string" && v === fromDefaults) return true;
  const factory = EMPTY_OR_FACTORY[key];
  return factory !== undefined && v === factory;
}

/** Fill blank (or factory-default) card fields from the event without overwriting edits. */
export function mergeEventIntoInviteContent(
  content: InviteCardContent,
  event: CeremonyEvent,
  templateId?: InviteTemplateId | string
): InviteCardContent {
  const resolvedTemplate =
    templateId ?? defaultTemplateForEvent(event.type);
  const defaults = buildDefaultInviteContentFromEvent(event, resolvedTemplate);
  const next = { ...content };

  const keys: (keyof InviteCardContent)[] = [
    "name1",
    "name2",
    "headline",
    "subtitle",
    "tagline",
    "hostLine",
    "honoree",
    "familyLine",
    "date",
    "time",
    "venue",
    "location",
    "dressCode",
    "ceremonyNote",
    "receptionNote",
    "footer",
    "rsvpNote",
  ];

  for (const key of keys) {
    const cur = next[key];
    if (typeof cur === "string" && shouldFillField(key, cur, defaults)) {
      const d = defaults[key];
      if (typeof d === "string") {
        (next as Record<string, unknown>)[key] = d;
      }
    }
  }

  if (!next.rsvpDeadline?.trim() && defaults.rsvpDeadline) {
    next.rsvpDeadline = defaults.rsvpDeadline;
  }

  if (
    !next.photoKey?.trim() &&
    (!next.photoUrl?.trim() || next.photoUrl === defaults.photoUrl) &&
    defaults.photoUrl
  ) {
    next.photoUrl = defaults.photoUrl;
  }

  if (!next.accentColor?.trim() || next.accentColor === "#9A7432") {
    next.accentColor = defaults.accentColor;
  }

  return next;
}

/** When switching templates, fill empty fields and refresh accent/font from template defaults. */
export function mergeTemplateDefaultsIntoContent(
  content: InviteCardContent,
  event: CeremonyEvent,
  templateId: InviteTemplateId | string
): InviteCardContent {
  const defaults = buildDefaultInviteContentFromEvent(event, templateId);
  const next: InviteCardContent = {
    ...content,
    accentColor: defaults.accentColor,
    font: defaults.font,
  };

  const keys: (keyof InviteCardContent)[] = [
    "name1",
    "name2",
    "headline",
    "subtitle",
    "tagline",
    "hostLine",
    "honoree",
    "familyLine",
    "date",
    "time",
    "venue",
    "location",
    "dressCode",
    "ceremonyNote",
    "receptionNote",
    "footer",
  ];

  for (const key of keys) {
    const d = defaults[key];
    if (typeof d !== "string" || !d.trim()) continue;
    const cur = (next[key] as string | undefined)?.trim() ?? "";
    if (!cur) {
      (next as unknown as Record<string, unknown>)[key] = d;
    }
  }

  return next;
}
