import {
  aggregateWithdrawalAmounts,
  computeAvailableToWithdraw,
} from "./withdraw-event-availability";

describe("computeAvailableToWithdraw", () => {
  it("subtracts completed and pending from platform raised", () => {
    expect(computeAvailableToWithdraw(500_000, 200_000, 50_000)).toBe(250_000);
  });

  it("clamps negative availability to zero", () => {
    expect(computeAvailableToWithdraw(100_000, 80_000, 50_000)).toBe(0);
  });
});

describe("aggregateWithdrawalAmounts", () => {
  it("sums completed into withdrawnSoFar only", () => {
    expect(
      aggregateWithdrawalAmounts([
        { status: "completed", grossAmount: 40_000 },
        { status: "completed", grossAmount: 10_000 },
      ])
    ).toEqual({ withdrawnSoFar: 50_000, pendingWithdrawals: 0 });
  });

  it("sums pending_otp and processing into pendingWithdrawals", () => {
    expect(
      aggregateWithdrawalAmounts([
        { status: "pending_otp", grossAmount: 20_000 },
        { status: "processing", grossAmount: 15_000 },
      ])
    ).toEqual({ withdrawnSoFar: 0, pendingWithdrawals: 35_000 });
  });

  it("ignores failed withdrawals", () => {
    expect(
      aggregateWithdrawalAmounts([
        { status: "failed", grossAmount: 99_000 },
        { status: "completed", grossAmount: 5_000 },
      ])
    ).toEqual({ withdrawnSoFar: 5_000, pendingWithdrawals: 0 });
  });

  it("handles mixed statuses", () => {
    expect(
      aggregateWithdrawalAmounts([
        { status: "completed", grossAmount: 30_000 },
        { status: "pending_otp", grossAmount: 10_000 },
        { status: "failed", grossAmount: 1_000 },
      ])
    ).toEqual({ withdrawnSoFar: 30_000, pendingWithdrawals: 10_000 });
  });
});
