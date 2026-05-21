/** e.g. 0.032 → "3.2%" */
export function formatFeeRatePercent(rate: number): string {
  const pct = rate * 100;
  const rounded = Math.round(pct * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}
