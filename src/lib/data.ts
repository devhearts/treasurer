// Helper functions (data now lives in SQLite via @/lib/db and @/app/actions/events)

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

export function getProgressPercent(raised: number, target: number): number {
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
