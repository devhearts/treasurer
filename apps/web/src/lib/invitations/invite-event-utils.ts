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
