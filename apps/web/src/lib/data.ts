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

export interface PaidContributionCashBreakdown {
  total: number;
  directToTreasurer: number;
  platform: number;
}

/** Split of paid contributions when any were recorded manually by the treasurer. */
export function getPaidContributionCashBreakdown(
  contributions: Contribution[]
): PaidContributionCashBreakdown | null {
  const paid = contributions.filter((c) => c.status === "paid");
  if (!paid.some((c) => c.manual)) return null;
  return {
    total: sumContributionAmounts(paid),
    directToTreasurer: sumContributionAmounts(paid.filter((c) => c.manual)),
    platform: sumContributionAmounts(paid.filter((c) => !c.manual)),
  };
}

export function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString("en-UG")}`;
}

/** Truncate (not round) to two decimal places. */
function truncateTo2Decimals(value: number): number {
  return Math.trunc(value * 100) / 100;
}

function formatCompactScaledBody(truncated: number): string {
  if (truncated === Math.trunc(truncated)) {
    return String(Math.trunc(truncated));
  }
  return truncated.toFixed(2);
}

type CompactAmountOptions = {
  prefix?: string;
  kSuffix?: string;
  mSuffix?: string;
  /** Use en-UG grouping for values under 10k (e.g. 5,500). */
  localeFull?: boolean;
};

/**
 * Compact amount: under 10k shown in full; ≥10k truncated to 2dp with k/M suffix.
 * e.g. 5500 → 5500, 123500 → 123.50k, 23450200 → 23.45M
 */
export function formatAmountCompact(
  amount: number,
  options: CompactAmountOptions = {}
): string {
  const {
    prefix = "",
    kSuffix = "k",
    mSuffix = "M",
    localeFull = false,
  } = options;
  const n = Math.max(0, Math.trunc(amount));

  if (n < 10_000) {
    const num = localeFull ? n.toLocaleString("en-UG") : String(n);
    return prefix ? `${prefix}${num}` : num;
  }

  if (n >= 1_000_000) {
    const body = formatCompactScaledBody(truncateTo2Decimals(n / 1_000_000));
    return `${prefix}${body}${mSuffix}`;
  }

  const body = formatCompactScaledBody(truncateTo2Decimals(n / 1_000));
  return `${prefix}${body}${kSuffix}`;
}

/** Compact balance for navbar pill (e.g. UGX 123.50K). */
export function formatUGXCompact(amount: number): string {
  return formatAmountCompact(amount, {
    prefix: "UGX ",
    kSuffix: "K",
    mSuffix: "M",
    localeFull: true,
  });
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
