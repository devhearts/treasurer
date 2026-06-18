import {
  aggregateWithdrawalAmounts,
  allocateLegacyWithdrawalsFifo,
  computeAvailableToWithdraw,
} from "./withdraw-event-availability";

describe("computeAvailableToWithdraw", () => {
  it("subtracts completed, pending, and legacy from platform raised", () => {
    expect(computeAvailableToWithdraw(500_000, 200_000, 50_000, 100_000)).toBe(
      150_000
    );
  });

  it("subtracts completed and pending from platform raised", () => {
    expect(computeAvailableToWithdraw(500_000, 200_000, 50_000)).toBe(250_000);
  });

  it("clamps negative availability to zero", () => {
    expect(computeAvailableToWithdraw(100_000, 80_000, 50_000)).toBe(0);
  });
});

describe("allocateLegacyWithdrawalsFifo", () => {
  it("returns zero attribution when legacy pool is empty", () => {
    const map = allocateLegacyWithdrawalsFifo(0, [
      { eventId: "a", platformRaised: 500_000, hasTrackedWithdrawals: false },
    ]);
    expect(map.get("a")).toBe(0);
  });

  it("attributes to a single untracked event capped at platformRaised", () => {
    const map = allocateLegacyWithdrawalsFifo(200_000, [
      { eventId: "a", platformRaised: 500_000, hasTrackedWithdrawals: false },
    ]);
    expect(map.get("a")).toBe(200_000);
    expect(
      computeAvailableToWithdraw(500_000, 0, 0, map.get("a")!)
    ).toBe(300_000);
  });

  it("attributes oldest untracked events first", () => {
    const map = allocateLegacyWithdrawalsFifo(500_000, [
      { eventId: "a", platformRaised: 500_000, hasTrackedWithdrawals: false },
      { eventId: "b", platformRaised: 300_000, hasTrackedWithdrawals: false },
    ]);
    expect(map.get("a")).toBe(500_000);
    expect(map.get("b")).toBe(0);
  });

  it("skips tracked events in FIFO", () => {
    const map = allocateLegacyWithdrawalsFifo(500_000, [
      { eventId: "a", platformRaised: 500_000, hasTrackedWithdrawals: true },
      { eventId: "b", platformRaised: 300_000, hasTrackedWithdrawals: false },
    ]);
    expect(map.get("a")).toBe(0);
    expect(map.get("b")).toBe(300_000);
  });

  it("caps attribution per event at platformRaised when pool is larger", () => {
    const map = allocateLegacyWithdrawalsFifo(1_000_000, [
      { eventId: "a", platformRaised: 200_000, hasTrackedWithdrawals: false },
      { eventId: "b", platformRaised: 100_000, hasTrackedWithdrawals: false },
    ]);
    expect(map.get("a")).toBe(200_000);
    expect(map.get("b")).toBe(100_000);
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
