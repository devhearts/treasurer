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

function truncateTo2Decimals(value: number): number {
  return Math.trunc(value * 100) / 100;
}

function formatCompactScaledBody(truncated: number): string {
  if (truncated === Math.trunc(truncated)) {
    return String(Math.trunc(truncated));
  }
  return truncated.toFixed(2);
}

/** Keep in sync with `formatAmountCompact` in apps/web/src/lib/data.ts */
export function formatBalanceCompact(amount: number, currency = "UGX"): string {
  const prefix = `${currency} `;
  const n = Math.max(0, Math.trunc(amount));

  if (n < 10_000) {
    return `${prefix}${n.toLocaleString("en-UG")}`;
  }

  if (n >= 1_000_000) {
    const body = formatCompactScaledBody(truncateTo2Decimals(n / 1_000_000));
    return `${prefix}${body}M`;
  }

  const body = formatCompactScaledBody(truncateTo2Decimals(n / 1_000));
  return `${prefix}${body}K`;
}
