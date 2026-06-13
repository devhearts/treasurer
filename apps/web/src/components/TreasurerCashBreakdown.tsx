import {
  formatUGX,
  getPaidContributionCashBreakdown,
} from "@/lib/data";
import type { Contribution } from "@/lib/types";

interface TreasurerCashBreakdownProps {
  contributions: Contribution[];
  raisedAmount: number;
  paidCount: number;
  pledgedCount: number;
  totalCount: number;
}

export default function TreasurerCashBreakdown({
  contributions,
  raisedAmount,
  paidCount,
  pledgedCount,
  totalCount,
}: TreasurerCashBreakdownProps) {
  const breakdown = getPaidContributionCashBreakdown(contributions);

  return (
    <div className="bg-light rounded-xl border border-muted/30 p-4 mb-4">
      <p className="text-xs text-muted uppercase tracking-wide mb-3">Summary</p>
      {breakdown ? (
        <div className="space-y-2">
          <div className="flex justify-between items-baseline gap-3">
            <span className="text-sm text-surface">Total Cash Raised</span>
            <span className="text-lg font-bold text-surface">
              {formatUGX(breakdown.total)}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-3 text-sm">
            <span className="text-muted">Total Direct to treasurer</span>
            <span className="font-medium text-surface">
              {formatUGX(breakdown.directToTreasurer)}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-3 text-sm">
            <span className="text-muted">Total through the CW Platform</span>
            <span className="font-medium text-surface">
              {formatUGX(breakdown.platform)}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-lg font-bold text-surface">{formatUGX(raisedAmount)}</p>
      )}
      <p className="text-sm text-muted mt-3 pt-3 border-t border-muted/20">
        {paidCount} paid · {pledgedCount} pledged · {totalCount} total
      </p>
    </div>
  );
}
