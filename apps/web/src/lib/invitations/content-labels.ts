import type { EventType } from "@/lib/types";
import { getEventTypeLabel } from "@/lib/data";
import type { InviteCardFieldKey, InviteTemplateId } from "./types";
import { getInviteTemplate } from "./template-registry";

export type { InviteCardFieldKey };

function baseLabelsByEventType(
  eventType: EventType | string
): Record<InviteCardFieldKey, string> {
  switch (eventType) {
    case "wedding":
      return {
        name1: "Partner 1",
        name2: "Partner 2 (optional)",
        headline: "Headline",
        subtitle: "Subtitle (optional)",
        tagline: "Tagline (optional)",
        hostLine: "Host line (optional)",
        honoree: "Honoree (optional)",
        familyLine: "Family line (optional)",
        date: "Date",
        time: "Time",
        venue: "Venue",
        location: "Location",
        dressCode: "Dress code (optional)",
        ceremonyNote: "Ceremony note (optional)",
        receptionNote: "Reception note (optional)",
        footer: "Footer note",
      };
    case "introduction":
      return {
        name1: "Host family",
        name2: "Guest of honour (optional)",
        headline: "Headline",
        subtitle: "Subtitle (optional)",
        tagline: "Tagline (optional)",
        hostLine: "Host line (optional)",
        honoree: "Guest of honour (optional)",
        familyLine: "Clan / family line (optional)",
        date: "Date",
        time: "Time",
        venue: "Venue",
        location: "Location",
        dressCode: "Dress code (optional)",
        ceremonyNote: "Ceremony note (optional)",
        receptionNote: "Reception note (optional)",
        footer: "Footer note",
      };
    case "funeral":
      return {
        name1: "In memory of",
        name2: "Hosted by (optional)",
        headline: "Headline",
        subtitle: "Subtitle (optional)",
        tagline: "Tagline (optional)",
        hostLine: "Hosted by (optional)",
        honoree: "Remembering (optional)",
        familyLine: "Family line (optional)",
        date: "Date",
        time: "Time",
        venue: "Service venue",
        location: "Location",
        dressCode: "Dress code (optional)",
        ceremonyNote: "Service note (optional)",
        receptionNote: "Gathering note (optional)",
        footer: "Footer note",
      };
    default:
      return {
        name1: "Host name",
        name2: "Co-host (optional)",
        headline: "Headline",
        subtitle: "Subtitle (optional)",
        tagline: "Tagline (optional)",
        hostLine: "Host line (optional)",
        honoree: "Honoree (optional)",
        familyLine: "Family line (optional)",
        date: "Date",
        time: "Time",
        venue: "Venue",
        location: "Location",
        dressCode: "Dress code (optional)",
        ceremonyNote: "Note (optional)",
        receptionNote: "Reception note (optional)",
        footer: "Footer note",
      };
  }
}

/** @deprecated Use getInviteFieldLabel */
export function inviteContentFieldLabels(
  eventType: EventType | string
): Record<InviteCardFieldKey, string> {
  return baseLabelsByEventType(eventType);
}

export function getInviteFieldLabel(
  eventType: EventType | string,
  templateId: InviteTemplateId | string,
  fieldKey: InviteCardFieldKey
): string {
  const def = getInviteTemplate(templateId);
  const fieldCfg = def.fields.find((f) => f.key === fieldKey);
  if (fieldCfg?.label) return fieldCfg.label;

  const eventTypeKey = (
    ["wedding", "introduction", "funeral", "other"] as const
  ).includes(eventType as EventType)
    ? (eventType as EventType)
    : "other";

  const override = def.labelOverrides?.[eventTypeKey]?.[fieldKey];
  if (override) return override;

  return baseLabelsByEventType(eventType)[fieldKey];
}

export function defaultInviteHeadline(eventType: EventType | string): string {
  return getEventTypeLabel(eventType);
}

export function defaultInviteFooter(eventType: EventType | string): string {
  switch (eventType) {
    case "wedding":
      return "Reception to follow";
    case "introduction":
      return "Your presence is requested";
    case "funeral":
      return "Condolences and support welcome";
    default:
      return "We hope you can join us";
  }
}
