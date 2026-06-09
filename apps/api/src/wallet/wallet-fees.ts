export interface WithdrawFeeBreakdown {
  grossAmount: number;
  momoFee: number;
  platformFee: number;
  netAmount: number;
  /** Effective MoMo rate for display (momoFee / grossAmount). */
  momoFeeRate: number;
  platformFeeRate: number;
}

/** Fixed levy by transaction band (UGX). */
export function momoTierFlatLevy(amount: number): number {
  if (amount < 499) return 0;
  if (amount <= 59_999) return 300;
  if (amount <= 499_999) return 600;
  if (amount <= 999_999) return 1_000;
  return 1_200;
}

/** Tiered MoMo fee: round(amount × baseRate) + band levy. */
export function computeMomoTieredFee(
  amount: number,
  baseRate: number
): number {
  return Math.round(amount * baseRate) + momoTierFlatLevy(amount);
}

export function computeWithdrawFees(
  grossAmount: number,
  momoFeePercent: number,
  platformFeeRate: number
): WithdrawFeeBreakdown {
  const momoFee = computeMomoTieredFee(grossAmount, momoFeePercent);
  const platformFee = Math.round(grossAmount * platformFeeRate);
  const netAmount = Math.max(0, grossAmount - momoFee - platformFee);
  const momoFeeRate =
    grossAmount > 0 ? momoFee / grossAmount : 0;
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
