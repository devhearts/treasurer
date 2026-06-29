export type PaymentProcessorKind = "mtn_momo" | "pawapay" | "rukapay";
export type PaymentNetwork = "mtn" | "airtel";

export type PaymentPollResult =
  | { status: "PENDING" }
  | { status: "SUCCESSFUL" }
  | { status: "FAILED"; message?: string }
  | { status: "NOT_FOUND" };

export interface RequestToPayParams {
  referenceId: string;
  amount: number;
  externalId: string;
  payerMsisdn: string;
  payerMessage: string;
  payeeNote: string;
}

export interface PaymentStatusBody {
  status: string;
  reason?: { message?: string; code?: string };
}

/**
 * Pluggable mobile-money collection provider (Request-to-Pay or equivalent).
 */
export interface PaymentProcessor {
  readonly kind: PaymentProcessorKind;
  readonly supportedNetworks: readonly PaymentNetwork[];
  isConfigured(): boolean;
  /** ISO currency for the charge, e.g. UGX; null when not configured. */
  getCurrency(): string | null;
  requestToPay(params: RequestToPayParams): Promise<void>;
  getPaymentStatus(referenceId: string): Promise<PaymentStatusBody>;
}
