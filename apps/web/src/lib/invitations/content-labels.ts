import type { EventType } from "@/lib/types";
import { getEventTypeLabel } from "@/lib/data";

export type InviteContentFieldKey =
  | "name1"
  | "name2"
  | "headline"
  | "date"
  | "time"
  | "venue"
  | "location"
  | "footer";

export function inviteContentFieldLabels(
  eventType: EventType | string
): Record<InviteContentFieldKey, string> {
  switch (eventType) {
    case "wedding":
      return {
        name1: "Partner 1",
        name2: "Partner 2 (optional)",
        headline: "Headline",
        date: "Date",
        time: "Time",
        venue: "Venue",
        location: "Location",
        footer: "Footer note",
      };
    case "introduction":
      return {
        name1: "Host family",
        name2: "Guest of honour (optional)",
        headline: "Headline",
        date: "Date",
        time: "Time",
        venue: "Venue",
        location: "Location",
        footer: "Footer note",
      };
    case "funeral":
      return {
        name1: "In memory of",
        name2: "Hosted by (optional)",
        headline: "Headline",
        date: "Date",
        time: "Time",
        venue: "Service venue",
        location: "Location",
        footer: "Footer note",
      };
    default:
      return {
        name1: "Host name",
        name2: "Co-host (optional)",
        headline: "Headline",
        date: "Date",
        time: "Time",
        venue: "Venue",
        location: "Location",
        footer: "Footer note",
      };
  }
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
