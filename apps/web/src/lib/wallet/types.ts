export type WalletTransactionDirection = "in" | "out";

export interface WalletAccountSummary {
  userId: string;
  balance: number;
  totalIn: number;
  totalOut: number;
  currency: string;
  balanceCompact: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  direction: WalletTransactionDirection;
  kind: string;
  amount: number;
  title: string;
  description: string;
  badge: string;
  eventId: string | null;
  contributionId: string | null;
  withdrawalId: string | null;
  createdAt: string;
}

export interface WalletTransactionsPage {
  transactions: WalletTransaction[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type PayoutMethodType = "mtn_momo" | "airtel_momo" | "bank";

export interface PayoutMethod {
  id: string;
  userId: string;
  type: PayoutMethodType;
  label: string;
  msisdn: string | null;
  accountNumber: string | null;
  bankName: string | null;
  branch: string | null;
  swift: string | null;
  isDefault: boolean;
  detailLine: string;
}

export interface PayoutMethodAddInitiate {
  pendingId: string;
  methodLabel: string;
  destination: string;
  otpEmailMasked: string;
  resendAvailableInSec: number;
}

export interface WithdrawFeeQuote {
  grossAmount: number;
  momoFee: number;
  platformFee: number;
  netAmount: number;
  momoFeeRate: number;
  platformFeeRate: number;
}

export interface WithdrawEventOption {
  id: string;
  title: string;
  slug: string;
  platformRaised: number;
  withdrawnSoFar: number;
  pendingWithdrawals: number;
  legacyWithdrawnAttributed: number;
  hasTrackedWithdrawals: boolean;
  availableToWithdraw: number;
}

export interface WithdrawEventOptionsPage {
  events: WithdrawEventOption[];
}

export interface WithdrawInitiateResult {
  withdrawalId: string;
  reference: string;
  status: string;
  grossAmount: number;
  momoFee: number;
  platformFee: number;
  netAmount: number;
  method: {
    id: string;
    type: string;
    label: string;
    detailLine: string;
  };
  otpEmailMasked: string;
  resendAvailableInSec: number;
}

export interface WithdrawPollSuccess {
  status: "SUCCESSFUL";
  withdrawal: {
    id: string;
    reference: string;
    grossAmount: number;
    momoFee: number;
    platformFee: number;
    netAmount: number;
    status: string;
    createdAt: string;
    methodLabel: string;
    methodDetail: string;
    methodType: string;
  };
}

export interface WithdrawPollFailed {
  status: "FAILED";
  message: string;
}

export interface WithdrawPollPending {
  status: "PENDING";
  withdrawal?: WithdrawPollSuccess["withdrawal"];
}

export type WithdrawPollResult =
  | WithdrawPollSuccess
  | WithdrawPollFailed
  | WithdrawPollPending;
