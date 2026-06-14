import {
  computeRaisedAmountFromRows,
} from "./event-raised-amount";

describe("computeRaisedAmountFromRows", () => {
  it("sums visible paid contributions only", () => {
    expect(
      computeRaisedAmountFromRows([
        { amount: 10_000, status: "paid", visible: 1 },
        { amount: 5_000, status: "paid", visible: 0 },
        { amount: 3_000, status: "pledged", visible: 1 },
      ])
    ).toBe(10_000);
  });

  it("treats missing visible as public", () => {
    expect(
      computeRaisedAmountFromRows([{ amount: 2_000, status: "paid" }])
    ).toBe(2_000);
  });
});
