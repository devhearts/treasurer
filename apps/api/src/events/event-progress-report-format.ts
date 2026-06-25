import { formatUGX, progressPercent } from "../common/format-ugx";
import type { ProgressReportContributionRow } from "./event-progress-report.types";

export type SummaryTableRow = {
  label: string;
  value: string;
  accent?: boolean;
};

export type PaidCashBreakdown = {
  totalCashRaised: number;
  directToTreasurer: number;
  platform: number;
  hasSplit: boolean;
};

export function normalizeReportTimeZone(timeZone?: string | null): string {
  const candidate = timeZone?.trim();
  if (!candidate) return "UTC";
  try {
    Intl.DateTimeFormat(undefined, { timeZone: candidate });
    return candidate;
  } catch {
    return "UTC";
  }
}

export function hasTimeComponent(value: string): boolean {
  const s = value.trim();
  if (!s) return false;
  if (s.includes("T")) return true;
  return /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s);
}

export function formatReportCalendarDate(
  iso: string,
  timeZone: string,
  style: "short" | "long" = "long"
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-UG", {
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
    timeZone,
  });
}

export function formatReportDateTime(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-UG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}

export function formatReportTimestamp(
  iso: string,
  timeZone: string,
  includeTime: boolean
): string {
  if (includeTime) {
    return formatReportDateTime(iso, timeZone);
  }
  return formatReportCalendarDate(iso, timeZone, "short");
}

export function formatProgressDisplay(
  raised: number,
  target: number
): string {
  if (target <= 0) return "—";
  return `${progressPercent(raised, target)}%`;
}

export function computePaidCashBreakdown(
  contributions: Pick<ProgressReportContributionRow, "amount" | "status" | "manual">[]
): PaidCashBreakdown {
  const paid = contributions.filter((c) => c.status === "paid");
  const totalCashRaised = paid.reduce((sum, c) => sum + c.amount, 0);
  const directToTreasurer = paid
    .filter((c) => c.manual)
    .reduce((sum, c) => sum + c.amount, 0);
  const platform = paid
    .filter((c) => !c.manual)
    .reduce((sum, c) => sum + c.amount, 0);
  return {
    totalCashRaised,
    directToTreasurer,
    platform,
    hasSplit: paid.some((c) => c.manual),
  };
}

export function buildFinancialSummaryRows(input: {
  targetAmount: number;
  raisedAmount: number;
  paidCount: number;
  pledgedCount: number;
  withdrawnSoFar: number;
  cashBreakdown: PaidCashBreakdown;
}): SummaryTableRow[] {
  const {
    targetAmount,
    raisedAmount,
    paidCount,
    pledgedCount,
    withdrawnSoFar,
    cashBreakdown,
  } = input;
  const rows: SummaryTableRow[] = [];

  if (targetAmount > 0) {
    rows.push({ label: "Target", value: formatUGX(targetAmount) });
  }

  const totalCash =
    cashBreakdown.totalCashRaised > 0
      ? cashBreakdown.totalCashRaised
      : raisedAmount;

  if (cashBreakdown.hasSplit) {
    rows.push({
      label: "Total Cash Raised",
      value: formatUGX(cashBreakdown.totalCashRaised),
      accent: true,
    });
    rows.push({
      label: "Total Direct to treasurer",
      value: formatUGX(cashBreakdown.directToTreasurer),
    });
    rows.push({
      label: "Total on Platform",
      value: formatUGX(cashBreakdown.platform),
    });
  } else {
    rows.push({
      label: "Total Cash Raised",
      value: formatUGX(totalCash),
      accent: true,
    });
  }

  rows.push({
    label: "Progress",
    value: formatProgressDisplay(raisedAmount, targetAmount),
    accent: targetAmount > 0,
  });
  rows.push({ label: "Cash contributions", value: String(paidCount) });
  rows.push({ label: "Pledged contributions", value: String(pledgedCount) });
  rows.push({
    label: "Withdrawn so far",
    value: formatUGX(withdrawnSoFar),
  });

  return rows;
}
