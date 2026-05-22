import type { InviteCardContent } from "./types";

/** Normalize API `content` when JSON arrived as a string (mysql2 quirk). */
function coerceRecord(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  let parsed: unknown = raw;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return {};
    }
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  return {};
}

export function normalizeInviteCardContent(raw: unknown): InviteCardContent {
  const o = coerceRecord(raw);
  return {
    name1: String(o.name1 ?? ""),
    name2: String(o.name2 ?? ""),
    headline: String(o.headline ?? "Celebration"),
    date: String(o.date ?? ""),
    time: String(o.time ?? ""),
    venue: String(o.venue ?? ""),
    location: String(o.location ?? ""),
    footer: String(o.footer ?? ""),
    font: (["serif", "sans-serif", "script", "monospace"].includes(
      String(o.font)
    )
      ? o.font
      : "serif") as InviteCardContent["font"],
    accentColor: String(o.accentColor ?? "#9A7432"),
    customMessage: o.customMessage ? String(o.customMessage) : undefined,
    rsvpEnabled: o.rsvpEnabled !== false,
    rsvpDeadline: o.rsvpDeadline ? String(o.rsvpDeadline) : undefined,
    rsvpNote: o.rsvpNote ? String(o.rsvpNote) : undefined,
  };
}
