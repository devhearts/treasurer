import {
  isAirtelUgandaMsisdn,
  isMtnUgandaMsisdn,
} from "../payments/phone";

describe("verification payout network detection", () => {
  it("detects MTN numbers for payout provisioning", () => {
    expect(isMtnUgandaMsisdn("256771234567")).toBe(true);
    expect(isAirtelUgandaMsisdn("256771234567")).toBe(false);
  });

  it("detects Airtel numbers for payout provisioning", () => {
    expect(isAirtelUgandaMsisdn("256701234567")).toBe(true);
    expect(isMtnUgandaMsisdn("256701234567")).toBe(false);
  });
});
