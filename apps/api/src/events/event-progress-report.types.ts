import type { EventWithdrawAvailability } from "../wallet/withdraw-event-availability";

export type ProgressReportContributionRow = {
  name: string;
  amount: number;
  status: "paid" | "pledged";
  date: string;
  milestoneName?: string;
  manual?: boolean;
  pledgeHopeBy?: string;
};

export type ProgressReportMilestoneRow = {
  name: string;
  targetAmount: number;
  raisedAmount: number;
};

export type ProgressReportWithdrawalRow = {
  createdAt: string;
  reference: string;
  status: string;
  methodLabel: string;
  grossAmount: number;
  fees: number;
  netAmount: number;
};

export type ProgressReportEventDetails = {
  title: string;
  type: string;
  typeLabel?: string | null;
  organizer: string;
  treasurerPhone: string;
  date: string;
  location: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  statusMessage?: string;
  statusChangedAt?: string;
};

export type ProgressReportData = {
  generatedAt: string;
  eventSlug: string;
  event: ProgressReportEventDetails;
  milestones: ProgressReportMilestoneRow[];
  contributions: ProgressReportContributionRow[];
  withdrawals: ProgressReportWithdrawalRow[];
  withdrawSummary: EventWithdrawAvailability;
};
