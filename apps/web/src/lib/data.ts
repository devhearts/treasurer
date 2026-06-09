// Helper functions (event data is loaded via the API — see @/app/actions/events).

import type { Contribution } from "@/lib/types";

/** Contributions included on public views and in receipt copy/share. */
export function isPublicContribution(c: Contribution): boolean {
  return c.visible !== false;
}

export function filterPublicContributions(
  contributions: Contribution[]
): Contribution[] {
  return contributions.filter(isPublicContribution);
}

export function sumContributionAmounts(contributions: Contribution[]): number {
  return contributions.reduce((sum, c) => sum + c.amount, 0);
}

export function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString("en-UG")}`;
}

/** Compact balance for navbar pill (e.g. UGX 142K). */
export function formatUGXCompact(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    const s = m % 1 === 0 ? String(m) : m.toFixed(1).replace(/\.0$/, "");
    return `UGX ${s}M`;
  }
  if (amount >= 1_000) {
    return `UGX ${Math.round(amount / 1_000)}K`;
  }
  return formatUGX(amount);
}

/** Format YYYY-MM-DD (or ISO date) for display in Uganda locale. */
export function formatCalendarDate(
  isoDate: string,
  monthStyle: "short" | "long" = "short"
): string {
  const s = isoDate.trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? new Date(`${s}T12:00:00`)
    : new Date(s);
  return d.toLocaleDateString("en-UG", {
    day: "numeric",
    month: monthStyle,
    year: "numeric",
  });
}

export function hasEventTarget(targetAmount: number): boolean {
  return targetAmount > 0;
}

export function getProgressPercent(raised: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.round((raised / target) * 100), 100);
}

export function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    wedding: "Wedding",
    introduction: "Introduction (Kwanjula)",
    funeral: "Funeral (Mabugo)",
    other: "Other Ceremony",
  };
  return labels[type] ?? "Ceremony";
}

export function getEventTypeKey(type: string): string {
  return type in { wedding: 1, introduction: 1, funeral: 1, other: 1 }
    ? type
    : "other";
}
