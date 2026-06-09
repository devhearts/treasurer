import {
  computeMomoTieredFee,
  computeWithdrawFees,
  momoTierFlatLevy,
} from "./wallet-fees";

const BASE = 0.04;
const PLATFORM = 0.012;

describe("momoTierFlatLevy", () => {
  it("returns band levies at boundaries", () => {
    expect(momoTierFlatLevy(498)).toBe(0);
    expect(momoTierFlatLevy(499)).toBe(300);
    expect(momoTierFlatLevy(59_999)).toBe(300);
    expect(momoTierFlatLevy(60_000)).toBe(600);
    expect(momoTierFlatLevy(499_999)).toBe(600);
    expect(momoTierFlatLevy(500_000)).toBe(1_000);
    expect(momoTierFlatLevy(999_999)).toBe(1_000);
    expect(momoTierFlatLevy(1_000_000)).toBe(1_200);
  });
});

describe("computeMomoTieredFee", () => {
  it.each([
    [498, 20],
    [499, 320],
    [5_000, 500],
    [59_999, 2_700],
    [60_000, 3_000],
    [500_000, 21_000],
    [1_000_000, 41_200],
  ])("amount %i → momo fee %i", (amount, expected) => {
    expect(computeMomoTieredFee(amount, BASE)).toBe(expected);
  });
});

describe("computeWithdrawFees", () => {
  it("net equals gross minus momo and platform fees", () => {
    const fees = computeWithdrawFees(5_000, BASE, PLATFORM);
    expect(fees.momoFee).toBe(500);
    expect(fees.platformFee).toBe(60);
    expect(fees.netAmount).toBe(4_440);
    expect(fees.momoFeeRate).toBeCloseTo(0.1, 5);
  });
});
