export function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString("en-UG")}`;
}

export function formatCalendarDate(
  iso: string,
  style: "short" | "long" = "long"
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-UG", {
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-UG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function progressPercent(raised: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((raised / target) * 100));
}
