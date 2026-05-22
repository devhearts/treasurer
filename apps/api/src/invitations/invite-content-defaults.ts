import type { InviteCardContent, InviteTemplateId } from "./invitations.types";

type EventSlice = {
  slug: string;
  title: string;
  organizer: string;
  date: string;
  location: string;
  type: string;
  description: string;
  imageUrls?: unknown;
};

export function defaultTemplateForEvent(eventType: string): InviteTemplateId {
  switch (eventType) {
    case "wedding":
      return "savedate";
    case "introduction":
      return "minimal";
    case "funeral":
      return "memorial";
    default:
      return "celebrate";
  }
}

function formatEventDateForCard(isoDate: string): string {
  const s = isoDate.trim();
  if (!s) return "";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? new Date(`${s}T12:00:00Z`)
    : new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-UG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function parseEventLocation(location: string): {
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

function defaultFooterForType(type: string): string {
  const footers: Record<string, string> = {
    wedding: "Reception to follow",
    introduction: "Your presence is requested",
    funeral: "Condolences and support welcome",
    other: "We hope you can join us",
  };
  return footers[type] ?? "We hope you can join us";
}

function defaultHeadlineForType(type: string): string {
  const labels: Record<string, string> = {
    wedding: "Wedding",
    introduction: "Introduction",
    funeral: "Memorial",
    other: "Celebration",
  };
  return labels[type] ?? "Celebration";
}

function isoDatePart(date: string): string {
  return date.trim().slice(0, 10);
}

function formatWeekdayComma(isoDate: string): string {
  const s = isoDatePart(isoDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const d = new Date(`${s}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString("en-US", { weekday: "long" })},`;
}

function formatDateShortUpper(isoDate: string): string {
  const s = isoDatePart(isoDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return formatEventDateForCard(isoDate).toUpperCase();
  const d = new Date(`${s}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return s.toUpperCase();
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return `${weekday} ${monthDay}`.toUpperCase();
}

function formatMonthDayUpper(isoDate: string): string {
  const s = isoDatePart(isoDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return formatEventDateForCard(isoDate).toUpperCase();
  const d = new Date(`${s}T12:00:00Z`);
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
  const d = new Date(`${s}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return s.toUpperCase();
  return d
    .toLocaleDateString("en-US", { month: "long", day: "numeric" })
    .toUpperCase();
}

function namesFromEvent(event: EventSlice): { name1: string; name2: string } {
  const parts = event.title.split(/\s*&\s*|\s+and\s+/i);
  const name1 = parts[0]?.trim() || event.organizer.trim() || "Host";
  const name2 = parts[1]?.trim() || "";
  return { name1, name2 };
}

function celebrationFromTitle(title: string): { name1: string; tagline: string } {
  const t = title.trim();
  const possessive = (who: string) =>
    who.endsWith("'s") || who.endsWith("\u2019s") ? who : `${who}'s`;
  if (!t) return { name1: "Guest of honour's", tagline: "CELEBRATION" };
  if (/\bbirthday\b/i.test(t)) {
    const who = t.replace(/\s*birthday.*/i, "").trim() || "Guest";
    return { name1: possessive(who), tagline: "BIRTHDAY" };
  }
  return { name1: possessive(t), tagline: "CELEBRATION" };
}

const TEMPLATE_ACCENT: Record<InviteTemplateId, string> = {
  royal: "#F7E5A9",
  botanical: "#6B7F4A",
  pop: "#FF3CAC",
  minimal: "#1a1a1a",
  pastel: "#D46B8A",
  cyber: "#00F5FF",
  memorial: "#D4AF37",
  heritage: "#B89966",
  celebrate: "#48B5A3",
  savedate: "#D4AF37",
  gala: "#D4AF37",
};

function templateLayer(
  event: EventSlice,
  templateId: InviteTemplateId
): Partial<InviteCardContent> {
  const type = event.type;
  const { name1, name2 } = namesFromEvent(event);
  const title = event.title.trim();
  const org = event.organizer.trim();
  const iso = isoDatePart(event.date);
  const fmtDate = formatEventDateForCard(event.date);
  const { venue, locationLine } = parseEventLocation(event.location);
  const fullLocation = [venue, locationLine].filter(Boolean).join(", ");
  const accentColor = TEMPLATE_ACCENT[templateId] ?? "#9A7432";
  const font: InviteCardContent["font"] =
    templateId === "celebrate" ||
    templateId === "gala" ||
    templateId === "pop" ||
    templateId === "cyber"
      ? "sans-serif"
      : "serif";

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
      return {
        name1,
        name2,
        headline: defaultHeadlineForType(type),
        date: fmtDate,
        venue,
        location: locationLine,
        footer: defaultFooterForType(type),
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
      return {
        name1,
        name2,
        headline: defaultHeadlineForType(type),
        subtitle: "We would love to see you there",
        date: fmtDate,
        venue,
        location: locationLine,
        footer: defaultFooterForType(type),
        accentColor,
        font,
      };
    case "pop":
      return {
        name1: name1.toUpperCase(),
        name2: name2 ? name2.toUpperCase() : "",
        headline: (type === "other" ? "Birthday" : defaultHeadlineForType(type)).toUpperCase(),
        tagline: "LET'S PARTY!",
        date: formatDateShortUpper(event.date).slice(0, 15),
        venue: venue.toUpperCase(),
        location: locationLine.toUpperCase(),
        footer: defaultFooterForType(type).toUpperCase(),
        accentColor,
        font,
      };
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
          footer: defaultFooterForType("introduction"),
          accentColor,
          font,
        };
      }
      return {
        name1: title || name1,
        headline: title || defaultHeadlineForType(type),
        hostLine: org ? `Presented by ${org}` : "You are invited",
        date: fmtDate,
        venue,
        location: locationLine,
        footer: defaultFooterForType(type),
        accentColor,
        font,
      };
    case "pastel":
      return {
        name1,
        name2,
        headline: type === "other" ? "Baby shower" : defaultHeadlineForType(type),
        subtitle: type === "other" ? "Oh baby!" : "Come celebrate with us",
        date: fmtDate,
        venue,
        location: locationLine,
        footer: defaultFooterForType(type),
        accentColor,
        font,
      };
    case "cyber":
      return {
        name1: (title.split(/\s+/)[0] || name1).toUpperCase().replace(/\s/g, "_"),
        name2: name2 ? name2.toUpperCase().replace(/\s/g, "_") : "",
        headline: (title || defaultHeadlineForType(type)).toUpperCase(),
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
          headline: "In loving Memory of",
          name1: title || name1,
          honoree: title || name1,
          date: fmtDate,
          venue,
          location: locationLine
            ? `${venue}\n${locationLine}`.trim()
            : event.location.trim(),
          hostLine: org || undefined,
          footer: org ? `Contact: ${org}` : defaultFooterForType("funeral"),
          accentColor,
          font,
        };
      }
      return {
        headline: "In loving Memory of",
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
          tagline: "MEMORIAL SERVICE",
          date: formatMonthDayUpper(event.date),
          location: fullLocation || event.location.trim(),
          hostLine: org || undefined,
          footer: org
            ? `${org}\nPlease reach out to the family`
            : defaultFooterForType("funeral"),
          accentColor,
          font,
        };
      }
      return {
        headline: "IN LOVING MEMORY",
        name1: title || name1,
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
          : defaultFooterForType(type).toUpperCase(),
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
        tagline: (title || defaultHeadlineForType(type)).toUpperCase(),
        date: iso,
        venue,
        location: locationLine,
        accentColor,
        font,
      };
    case "gala": {
      const footerLines = [
        org ? `RSVP TO ${org.toUpperCase()}` : "",
        iso ? `BY ${formatRsvpDeadlineUpper(iso)}` : "",
      ].filter(Boolean);
      return {
        hostLine: (org || title || name1).toUpperCase(),
        subtitle: "CORDIALLY INVITES YOU TO A",
        tagline: title || `${defaultHeadlineForType(type)} Event`,
        headline: (title || defaultHeadlineForType(type)).toUpperCase(),
        date: formatWeekdayComma(event.date),
        time: `${formatMonthDayUpper(event.date)} AT 8:00 PM`,
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

export function eventGalleryPhotoUrl(slug: string): string {
  return `/api/v1/events/by-slug/${encodeURIComponent(slug)}/gallery/0`;
}

export function eventHasStoredImages(raw: unknown): boolean {
  if (raw == null) return false;
  let parsed: unknown = raw;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return false;
    }
  }
  return Array.isArray(parsed) && parsed.length > 0;
}

export function defaultContentFromEvent(
  event: EventSlice,
  templateId?: InviteTemplateId
): InviteCardContent {
  const resolved = templateId ?? defaultTemplateForEvent(event.type);
  const { name1, name2 } = namesFromEvent(event);
  const { venue, locationLine } = parseEventLocation(event.location);
  const desc = event.description.trim();
  const footer =
    desc.length > 0 && desc.length <= 120
      ? desc
      : defaultFooterForType(event.type);
  const eventTitle = event.title.trim();

  const shared: InviteCardContent = {
    name1,
    name2,
    headline: defaultHeadlineForType(event.type),
    date: formatEventDateForCard(event.date),
    time: "",
    venue,
    location: locationLine,
    footer,
    font: "serif",
    accentColor: "#9A7432",
    rsvpEnabled: true,
    rsvpDeadline: event.date.trim().slice(0, 10) || undefined,
    rsvpNote: eventTitle
      ? `Please RSVP for ${eventTitle}.`
      : "Please respond at your earliest convenience.",
  };

  const layer = templateLayer(event, resolved);
  const content: InviteCardContent = {
    ...shared,
    ...layer,
    name1: layer.name1 ?? shared.name1,
    name2: layer.name2 ?? shared.name2,
    headline: layer.headline ?? shared.headline,
    date: layer.date ?? shared.date,
    venue: layer.venue ?? shared.venue,
    location: layer.location ?? shared.location,
    footer: layer.footer ?? shared.footer,
    font: layer.font ?? shared.font,
    accentColor: layer.accentColor ?? shared.accentColor,
  };

  if (eventHasStoredImages(event.imageUrls)) {
    content.photoUrl = eventGalleryPhotoUrl(event.slug);
  }

  return content;
}
