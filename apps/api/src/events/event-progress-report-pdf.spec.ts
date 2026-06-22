import {
  buildProgressReportPdf,
  type ProgressReportData,
} from "./event-progress-report-pdf";

const fixture: ProgressReportData = {
  generatedAt: "2026-06-22T10:00:00.000Z",
  eventSlug: "jane-john-wedding",
  event: {
    title: "Jane & John Wedding",
    type: "wedding",
    organizer: "Jane Doe",
    treasurerPhone: "256700000001",
    date: "2026-08-15",
    location: "Kampala",
    description: "Celebrating our union.",
    targetAmount: 5_000_000,
    raisedAmount: 3_250_000,
    statusMessage: "Thank you for your support.",
    statusChangedAt: "2026-06-20T14:30:00.000Z",
  },
  milestones: [
    { name: "Venue", targetAmount: 2_000_000, raisedAmount: 1_500_000 },
    { name: "Catering", targetAmount: 1_500_000, raisedAmount: 1_000_000 },
  ],
  contributions: [
    {
      name: "Alice",
      amount: 500_000,
      status: "paid",
      date: "2026-05-01",
      milestoneName: "Venue",
    },
    {
      name: "Anonymous",
      amount: 200_000,
      status: "pledged",
      date: "2026-05-10",
      pledgeHopeBy: "2026-06-30",
    },
  ],
  withdrawals: [
    {
      createdAt: "2026-06-18T09:00:00.000Z",
      reference: "CW-2026-0618090000",
      status: "completed",
      methodLabel: "MTN MoMo",
      grossAmount: 1_000_000,
      fees: 52_000,
      netAmount: 948_000,
    },
  ],
  withdrawSummary: {
    platformRaised: 2_500_000,
    withdrawnSoFar: 1_000_000,
    pendingWithdrawals: 0,
    legacyWithdrawnAttributed: 0,
    hasTrackedWithdrawals: true,
    availableToWithdraw: 1_500_000,
  },
};

describe("buildProgressReportPdf", () => {
  it("returns a non-empty PDF buffer with valid header", async () => {
    const buffer = await buildProgressReportPdf(fixture);
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });

  it("produces a multi-section report for typical event data", async () => {
    const buffer = await buildProgressReportPdf(fixture);
    expect(buffer.length).toBeGreaterThan(1500);
    expect(buffer.toString("latin1")).toContain("/Type /Pages");
  });

  it("handles empty contributions and withdrawals", async () => {
    const buffer = await buildProgressReportPdf({
      ...fixture,
      milestones: [],
      contributions: [],
      withdrawals: [],
      withdrawSummary: {
        ...fixture.withdrawSummary,
        withdrawnSoFar: 0,
        availableToWithdraw: fixture.withdrawSummary.platformRaised,
      },
    });
    expect(buffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(500);
  });
});
