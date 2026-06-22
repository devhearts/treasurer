import type { EventType } from "@/lib/types";
import type { CeremonyEvent } from "@/lib/types";
import { getEventTypeLabel } from "@/lib/data";
import { getInviteTemplate } from "./template-registry";
import type { InviteCardContent, InviteTemplateId } from "./types";
import {
  formatEventDateForCard,
  parseEventLocation,
} from "./invite-event-utils";
import { defaultInviteFooter } from "./content-labels";

type EventSlice = Pick<
  CeremonyEvent,
  "title" | "organizer" | "date" | "location" | "type" | "typeLabel" | "description"
>;

export function defaultTemplateForEvent(eventType: EventType | string): InviteTemplateId {
  switch (eventType) {
    case "wedding":
      return "savedate";
    case "introduction":
      return "minimal";
    case "funeral":
      return "memorial";
    case "charity":
      return "celebrate";
    default:
      return "celebrate";
  }
}

function namesFromEvent(event: EventSlice): { name1: string; name2: string } {
  const parts = event.title.split(/\s*&\s*|\s+and\s+/i);
  const name1 = parts[0]?.trim() || event.organizer.trim() || "Host";
  const name2 = parts[1]?.trim() || "";
  return { name1, name2 };
}

function isoDatePart(date: string): string {
  return date.trim().slice(0, 10);
}

/** e.g. "Friday," */
export function formatWeekdayComma(isoDate: string): string {
  const s = isoDatePart(isoDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString("en-US", { weekday: "long" })},`;
}

/** e.g. "SATURDAY AUGUST 8" */
export function formatDateShortUpper(isoDate: string): string {
  const s = isoDatePart(isoDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return formatEventDateForCard(isoDate).toUpperCase();
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return s.toUpperCase();
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return `${weekday} ${monthDay}`.toUpperCase();
}

/** e.g. "NOVEMBER 20TH" */
export function formatMonthDayUpper(isoDate: string): string {
  const s = isoDatePart(isoDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return formatEventDateForCard(isoDate).toUpperCase();
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return s.toUpperCase();
  const month = d.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "ST"
      : day % 10 === 2 && day !== 12
        ? "ND"
        : day % 10 === 3 && day !== 13
          ? "RD"
          : "TH";
  return `${month} ${day}${suffix}`;
}

function formatRsvpDeadlineUpper(isoDate: string): string {
  const s = isoDatePart(isoDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.toUpperCase();
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return s.toUpperCase();
  return d
    .toLocaleDateString("en-US", { month: "long", day: "numeric" })
    .toUpperCase();
}

function celebrationFromTitle(title: string): { name1: string; tagline: string } {
  const t = title.trim();
  if (!t) return { name1: "Guest of honour's", tagline: "CELEBRATION" };
  const possessive = (who: string) =>
    who.endsWith("'s") || who.endsWith("\u2019s") ? who : `${who}'s`;

  const birthday = t.match(/^(.+?)(?:'s|\u2019s)?\s*(.+birthday.*)$/i);
  if (birthday) {
    const who = birthday[1].trim();
    const rest = birthday[2].trim();
    return {
      name1: possessive(who),
      tagline: rest.toUpperCase(),
    };
  }
  if (/\bbirthday\b/i.test(t)) {
    const who = t.replace(/\s*birthday.*/i, "").trim() || "Guest";
    return {
      name1: possessive(who),
      tagline: "BIRTHDAY",
    };
  }
  return {
    name1: possessive(t),
    tagline: getEventTypeLabel("other").toUpperCase(),
  };
}

function preferredFont(templateId: InviteTemplateId): InviteCardContent["font"] {
  switch (templateId) {
    case "celebrate":
    case "gala":
    case "pop":
    case "cyber":
      return "sans-serif";
    default:
      return "serif";
  }
}

/** Template- and event-type-specific card field defaults (merged over shared event data). */
export function templateContentDefaults(
  event: EventSlice,
  templateId: InviteTemplateId
): Partial<InviteCardContent> {
  const def = getInviteTemplate(templateId);
  const type = event.type;
  const typeLabel = getEventTypeLabel(event.type, event.typeLabel);
  const { name1, name2 } = namesFromEvent(event);
  const title = event.title.trim();
  const org = event.organizer.trim();
  const iso = isoDatePart(event.date);
  const fmtDate = formatEventDateForCard(event.date);
  const { venue, locationLine } = parseEventLocation(event.location);
  const fullLocation = [venue, locationLine].filter(Boolean).join(", ");
  const rsvpDeadline = iso || undefined;

  const accentColor = def.palette.accent;
  const font = preferredFont(templateId);

  switch (templateId) {
    case "royal":
      if (type === "wedding") {
        return {
          name1,
          name2,
          headline: "Wedding",
          subtitle: "Together with their families",
          tagline: "Request the pleasure of your company",
          date: fmtDate,
          venue,
          location: locationLine,
          footer: "Reception to follow",
          accentColor,
          font,
        };
      }
      if (type === "funeral") {
        return {
          name1: title || name1,
          headline: def.defaultHeader,
          date: fmtDate,
          venue,
          location: locationLine,
          footer: defaultInviteFooter("funeral"),
          accentColor,
          font,
        };
      }
      return {
        name1,
        name2,
        headline: typeLabel,
        date: fmtDate,
        venue,
        location: locationLine,
        footer: defaultInviteFooter(type),
        accentColor,
        font,
      };

    case "botanical":
      if (type === "wedding") {
        return {
          name1,
          name2,
          headline: "Wedding",
          subtitle: "An afternoon in the garden",
          date: fmtDate,
          venue,
          location: locationLine,
          footer: "Light refreshments served",
          accentColor,
          font,
        };
      }
      if (type === "introduction") {
        return {
          name1,
          name2,
          headline: "Introduction",
          subtitle: "With joy and gratitude",
          hostLine: org || undefined,
          date: fmtDate,
          venue,
          location: locationLine,
          footer: defaultInviteFooter("introduction"),
          accentColor,
          font,
        };
      }
      return {
        name1,
        name2,
        headline: typeLabel,
        subtitle: "We would love to see you there",
        date: fmtDate,
        venue,
        location: locationLine,
        footer: defaultInviteFooter(type),
        accentColor,
        font,
      };

    case "pop": {
      const popHeadline =
        type === "wedding"
          ? "Wedding"
          : type === "other"
            ? "Birthday"
            : typeLabel;
      return {
        name1: name1.toUpperCase(),
        name2: name2 ? name2.toUpperCase() : "",
        headline: popHeadline.toUpperCase(),
        tagline: type === "other" ? "LET'S PARTY!" : "YOU'RE INVITED",
        date: formatDateShortUpper(event.date).replace(/,.*/, "").slice(0, 12),
        venue: venue.toUpperCase(),
        location: locationLine.toUpperCase(),
        footer: defaultInviteFooter(type).toUpperCase(),
        accentColor,
        font,
      };
    }

    case "minimal":
      if (type === "introduction") {
        return {
          name1: org || name1,
          name2,
          headline: title || "Introduction ceremony",
          hostLine: org ? `Hosted by ${org}` : "You are invited",
          date: fmtDate,
          venue,
          location: locationLine,
          footer: defaultInviteFooter("introduction"),
          accentColor,
          font,
        };
      }
      if (type === "funeral") {
        return {
          name1: title || name1,
          headline: "Memorial gathering",
          date: fmtDate,
          venue,
          location: locationLine,
          footer: defaultInviteFooter("funeral"),
          accentColor,
          font,
        };
      }
      return {
        name1: title || name1,
        headline: title || typeLabel,
        hostLine: org ? `Presented by ${org}` : "You are invited",
        date: fmtDate,
        venue,
        location: locationLine,
        footer: defaultInviteFooter(type),
        accentColor,
        font,
      };

    case "pastel":
      return {
        name1,
        name2,
        headline:
          type === "wedding"
            ? "Wedding celebration"
            : type === "other"
              ? "Baby shower"
              : typeLabel,
        subtitle: type === "other" ? "Oh baby!" : "Come celebrate with us",
        date: fmtDate,
        venue,
        location: locationLine,
        footer:
          type === "other"
            ? "Registry details on request"
            : defaultInviteFooter(type),
        accentColor,
        font,
      };

    case "cyber":
      return {
        name1: (title.split(/\s+/)[0] || name1).toUpperCase().replace(/\s/g, "_"),
        name2: name2 ? name2.toUpperCase().replace(/\s/g, "_") : "",
        headline: (title || typeLabel).toUpperCase(),
        tagline: "ACCESS GRANTED",
        hostLine: org ? org.toUpperCase() : undefined,
        date: iso ? iso.replace(/-/g, ".") : fmtDate,
        venue: venue.toUpperCase() || "SECTOR HQ",
        location: (locationLine || event.location).toUpperCase(),
        footer: "BRING YOUR PASSCODE",
        accentColor,
        font,
      };

    case "memorial":
      if (type === "funeral") {
        return {
          headline: def.defaultHeader,
          name1: title || name1,
          honoree: title || name1,
          subtitle: "",
          tagline: "",
          date: fmtDate,
          venue,
          location: locationLine
            ? `${venue}\n${locationLine}`.trim()
            : event.location.trim(),
          hostLine: org || undefined,
          footer: org ? `Contact: ${org}` : defaultInviteFooter("funeral"),
          accentColor,
          font,
        };
      }
      return {
        headline: def.defaultHeader,
        name1: title || name1,
        date: fmtDate,
        venue,
        location: locationLine,
        accentColor,
        font,
      };

    case "heritage":
      if (type === "funeral") {
        return {
          headline: "IN LOVING MEMORY",
          name1: title || name1,
          subtitle: "",
          tagline: "MEMORIAL SERVICE",
          date: formatMonthDayUpper(event.date),
          venue,
          location: fullLocation || event.location.trim(),
          hostLine: org || undefined,
          footer: org
            ? `${org}\nPlease reach out to the family`
            : defaultInviteFooter("funeral"),
          accentColor,
          font,
        };
      }
      return {
        headline: "IN LOVING MEMORY",
        name1: title || name1,
        tagline: "CELEBRATION OF LIFE",
        date: formatMonthDayUpper(event.date),
        location: fullLocation,
        accentColor,
        font,
      };

    case "celebrate": {
      const { name1: celebName, tagline: celebTag } = celebrationFromTitle(title);
      return {
        headline: "YOU ARE INVITED TO CELEBRATE",
        name1: celebName,
        tagline: celebTag,
        date: formatDateShortUpper(event.date),
        venue: venue.toUpperCase() || event.location.toUpperCase(),
        location: locationLine.toUpperCase(),
        footer: org
          ? `RSVP TO ${org.toUpperCase()}`
          : defaultInviteFooter(type).toUpperCase(),
        accentColor,
        font,
      };
    }

    case "savedate":
      if (type === "wedding") {
        return {
          name1,
          name2,
          subtitle: "JOYFULLY INVITES YOU TO JOIN",
          tagline: "THEIR WEDDING CELEBRATION",
          date: iso,
          time: "5 O'CLOCK IN THE EVENING",
          venue: venue || event.location.trim(),
          location: locationLine,
          accentColor,
          font,
        };
      }
      return {
        name1,
        name2,
        subtitle: "PLEASE SAVE THE DATE FOR",
        tagline: (title || typeLabel).toUpperCase(),
        date: iso,
        time: "",
        venue,
        location: locationLine,
        accentColor,
        font,
      };

    case "gala": {
      const orgLine = (org || title || name1).toUpperCase();
      const footerLines = [
        org ? `RSVP TO ${org.toUpperCase()}` : "",
        rsvpDeadline ? `BY ${formatRsvpDeadlineUpper(rsvpDeadline)}` : "",
      ].filter(Boolean);
      return {
        hostLine: orgLine,
        subtitle: "CORDIALLY INVITES YOU TO A",
        tagline:
          type === "other" && title
            ? title.replace(/\bfundraiser\b/i, "Annual Fundraiser")
            : `${typeLabel} Event`,
        headline: (title || typeLabel).toUpperCase(),
        date: formatWeekdayComma(event.date),
        time: `${formatMonthDayUpper(event.date)}${iso ? " AT 8:00 PM" : ""}`,
        venue: (venue || "VENUE TBA").toUpperCase(),
        location: (fullLocation || event.location || "ADDRESS TBA").toUpperCase(),
        ceremonyNote: "Join us for Dinner & Dancing",
        footer: footerLines.join("\n"),
        accentColor,
        font,
      };
    }

    default:
      return { accentColor, font };
  }
}
