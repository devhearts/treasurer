export type PaymentProcessorKind = "mtn_momo" | "pawapay";
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
  /** Full provider response for reconciliation audit. */
  rawPayload?: Record<string, unknown> | null;
}

export type ReconcilePaymentIntentResult =
  | {
      terminal: false;
      reason:
        | "missing"
        | "already_fulfilled"
        | "pending"
        | "fetch_error"
        | "processor_not_configured";
    }
  | {
      terminal: true;
      outcome: "completed" | "failed";
      kind: "contribution" | "subscription";
      processor: PaymentProcessorKind;
      providerStatus: string;
      failureCode?: string | null;
      failureMessage?: string | null;
      providerPayload: Record<string, unknown> | null;
    };

export interface PaymentProcessor {
  readonly kind: PaymentProcessorKind;
  readonly supportedNetworks: readonly PaymentNetwork[];
  isConfigured(): boolean;
  getCurrency(): string | null;
  requestToPay(params: RequestToPayParams): Promise<void>;
  getPaymentStatus(referenceId: string): Promise<PaymentStatusBody>;
}
