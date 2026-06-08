export interface WithdrawFeeBreakdown {
  grossAmount: number;
  momoFee: number;
  platformFee: number;
  netAmount: number;
  momoFeeRate: number;
  platformFeeRate: number;
}

export function computeWithdrawFees(
  grossAmount: number,
  momoFeeRate: number,
  platformFeeRate: number
): WithdrawFeeBreakdown {
  const momoFee = Math.round(grossAmount * momoFeeRate);
  const platformFee = Math.round(grossAmount * platformFeeRate);
  const netAmount = Math.max(0, grossAmount - momoFee - platformFee);
  return {
    grossAmount,
    momoFee,
    platformFee,
    netAmount,
    momoFeeRate,
    platformFeeRate,
  };
}

export function formatBalanceCompact(amount: number, currency = "UGX"): string {
  if (amount >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (amount >= 1_000) {
    return `${currency} ${Math.round(amount / 1_000)}K`;
  }
  return `${currency} ${amount.toLocaleString("en-UG")}`;
}
