import sharp from "sharp";

/** Matches `events.id` (varchar 36): single Garage path segment, no slashes. */
const EVENT_ID_PATH_SEGMENT_RE = /^[-a-zA-Z0-9_]{1,36}$/;

export const EVENT_OG_WIDTH = 1200;
export const EVENT_OG_HEIGHT = 630;
/** PNG compression level 0–9 (higher = smaller, slower). */
export const EVENT_OG_PNG_COMPRESSION = 9;
export const EVENT_OG_CONTENT_TYPE = "image/png";

/** Legacy WebP OG objects from an earlier format — removed on next slot-0 sync. */
export function legacyEventOgWebpKey(eventId: string): string {
  return `events/${eventId}/og.webp`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isEventImageGarageKey(key: string, eventId: string): boolean {
  if (!EVENT_ID_PATH_SEGMENT_RE.test(eventId)) return false;
  const re = new RegExp(
    `^events/${escapeRegExp(eventId)}/[0-2]\\.(jpg|jpeg|png|webp)$`,
    "i"
  );
  return re.test(key);
}

export function slotFromEventImageKey(key: string): number {
  const m = /\/([0-2])\./.exec(key);
  return m ? parseInt(m[1], 10) : 0;
}

export function eventOgImageKey(eventId: string): string {
  return `events/${eventId}/og.png`;
}

export function isEventOgImageKey(key: string, eventId: string): boolean {
  if (!EVENT_ID_PATH_SEGMENT_RE.test(eventId)) return false;
  return key === eventOgImageKey(eventId);
}

export function slot0KeyFromGarageKeys(
  keys: string[],
  eventId: string
): string | null {
  const garageKeys = keys.filter((k) => isEventImageGarageKey(k, eventId));
  garageKeys.sort(
    (a, b) => slotFromEventImageKey(a) - slotFromEventImageKey(b)
  );
  for (const k of garageKeys) {
    if (slotFromEventImageKey(k) === 0) return k;
  }
  return null;
}

export async function compressEventOgImage(source: Buffer): Promise<Buffer> {
  return sharp(source)
    .rotate()
    .resize(EVENT_OG_WIDTH, EVENT_OG_HEIGHT, {
      fit: "cover",
      position: "centre",
    })
    .png({ compressionLevel: EVENT_OG_PNG_COMPRESSION })
    .toBuffer();
}
