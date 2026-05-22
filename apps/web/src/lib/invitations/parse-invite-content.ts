import type { InviteCardContent } from "./types";
import {
  CORE_CARD_FIELD_KEYS,
  OPTIONAL_CARD_FIELD_KEYS,
} from "./types";

const KNOWN_STRING_KEYS = new Set<string>([
  ...CORE_CARD_FIELD_KEYS,
  ...OPTIONAL_CARD_FIELD_KEYS,
]);

const META_KEYS = new Set([
  "font",
  "accentColor",
  "customMessage",
  "photoUrl",
  "photoKey",
  "rsvpEnabled",
  "rsvpDeadline",
  "rsvpNote",
  "extra",
]);

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

function str(o: Record<string, unknown>, key: string, fallback = ""): string {
  const v = o[key];
  return v != null ? String(v) : fallback;
}

function optionalStr(
  o: Record<string, unknown>,
  key: string
): string | undefined {
  const v = o[key];
  if (v == null || String(v).trim() === "") return undefined;
  return String(v);
}

export function normalizeInviteCardContent(raw: unknown): InviteCardContent {
  const o = coerceRecord(raw);
  const extra: Record<string, string> = {
    ...(typeof o.extra === "object" && o.extra && !Array.isArray(o.extra)
      ? Object.fromEntries(
          Object.entries(o.extra as Record<string, unknown>)
            .filter(([, v]) => typeof v === "string")
            .map(([k, v]) => [k, v as string])
        )
      : {}),
  };

  for (const [k, v] of Object.entries(o)) {
    if (META_KEYS.has(k) || KNOWN_STRING_KEYS.has(k)) {
      continue;
    }
    if (typeof v === "string" && v.trim()) {
      extra[k] = v;
    }
  }

  const content: InviteCardContent = {
    name1: str(o, "name1"),
    name2: str(o, "name2"),
    headline: str(o, "headline", "Celebration"),
    subtitle: optionalStr(o, "subtitle"),
    tagline: optionalStr(o, "tagline"),
    hostLine: optionalStr(o, "hostLine"),
    honoree: optionalStr(o, "honoree"),
    familyLine: optionalStr(o, "familyLine"),
    date: str(o, "date"),
    time: str(o, "time"),
    venue: str(o, "venue"),
    location: str(o, "location"),
    dressCode: optionalStr(o, "dressCode"),
    ceremonyNote: optionalStr(o, "ceremonyNote"),
    receptionNote: optionalStr(o, "receptionNote"),
    footer: str(o, "footer"),
    font: (["serif", "sans-serif", "script", "monospace"].includes(
      String(o.font)
    )
      ? o.font
      : "serif") as InviteCardContent["font"],
    accentColor: str(o, "accentColor", "#9A7432"),
    photoUrl: optionalStr(o, "photoUrl"),
    photoKey: optionalStr(o, "photoKey"),
    customMessage: optionalStr(o, "customMessage"),
    rsvpEnabled: o.rsvpEnabled !== false,
    rsvpDeadline: optionalStr(o, "rsvpDeadline"),
    rsvpNote: optionalStr(o, "rsvpNote"),
    extra: Object.keys(extra).length > 0 ? extra : undefined,
  };

  return content;
}
