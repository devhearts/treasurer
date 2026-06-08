import type { PawapayConfig } from "./pawapay.config";
import {
  authHeaders,
  clampPawapayCustomerMessage,
  parseJsonText,
  readResponseText,
} from "./pawapay.http";
import {
  PaymentProcessorHttpError,
  pawapayErrorMessage,
  pawapayFailureCode,
  tryParseJsonBody,
} from "./payment-processor-error.util";
import { pawapayPayoutIdFromParsed } from "./pawapay.payout-status.util";

export type PawapayPayoutInitiationStatus =
  | "ACCEPTED"
  | "REJECTED"
  | "DUPLICATE_IGNORED";

export interface PawapayPayoutInitiationResponse {
  payoutId: string;
  status: PawapayPayoutInitiationStatus;
  created?: string;
  failureCode?: string;
  failureMessage?: string;
  failureReason?: {
    failureCode?: string;
    failureMessage?: string;
  };
}

export type PawapayPayoutDataStatus =
  | "ACCEPTED"
  | "PROCESSING"
  | "ENQUEUED"
  | "COMPLETED"
  | "FAILED"
  | "IN_RECONCILIATION";

export interface PawapayPayoutCheckResponse {
  status: "FOUND" | "NOT_FOUND";
  data?: {
    payoutId: string;
    status: PawapayPayoutDataStatus;
    failureReason?: {
      failureCode?: string;
      failureMessage?: string;
    };
  };
}

export interface PawapayProviderPrediction {
  country: string;
  provider: string;
  phoneNumber: string;
}

/** @deprecated Use PaymentProcessorHttpError */
export class PawapayPayoutHttpError extends PaymentProcessorHttpError {
  constructor(message: string, httpStatus: number, failureCode?: string) {
    super(message, {
      provider: "pawapay",
      operation: "payout",
      httpStatus,
      rawBody: "",
      failureCode,
    });
  }
}

function pawapayHttpError(
  operation: string,
  httpStatus: number,
  rawBody: string,
  parsed?: unknown,
  failureCode?: string
): PaymentProcessorHttpError {
  return new PaymentProcessorHttpError(
    pawapayErrorMessage(parsed, rawBody, httpStatus),
    {
      provider: "pawapay",
      operation,
      httpStatus,
      rawBody,
      parsedBody: parsed,
      failureCode: failureCode ?? pawapayFailureCode(parsed),
      payoutId: pawapayPayoutIdFromParsed(parsed),
    }
  );
}

/** POST /v2/predict-provider — validate MSISDN and resolve provider for payouts. */
export async function pawapayPredictProvider(
  config: PawapayConfig,
  phoneNumber: string
): Promise<PawapayProviderPrediction> {
  const res = await fetch(`${config.baseUrl}/v2/predict-provider`, {
    method: "POST",
    headers: authHeaders(config.apiToken),
    body: JSON.stringify({ phoneNumber }),
  });
  const rawBody = await readResponseText(res);
  const parsed = tryParseJsonBody(rawBody);

  if (!res.ok) {
    throw pawapayHttpError("predictProvider", res.status, rawBody, parsed);
  }

  const data = parseJsonText<PawapayProviderPrediction>(rawBody, "predictProvider");
  if (!data.provider || !data.phoneNumber) {
    throw new Error("PawaPay predictProvider: missing provider or phoneNumber");
  }
  return data;
}

/** POST /v2/payouts — initiate payout (see https://docs.pawapay.io/v2/docs/payouts). */
export async function pawapayInitiatePayout(
  config: PawapayConfig,
  input: {
    payoutId: string;
    amount: string;
    currency: string;
    phoneNumber: string;
    provider: string;
    clientReferenceId?: string;
    customerMessage?: string;
  }
): Promise<PawapayPayoutInitiationResponse> {
  const body: Record<string, unknown> = {
    payoutId: input.payoutId,
    amount: input.amount,
    currency: input.currency,
    recipient: {
      type: "MMO",
      accountDetails: {
        phoneNumber: input.phoneNumber,
        provider: input.provider,
      },
    },
  };
  if (input.clientReferenceId) {
    body.clientReferenceId = input.clientReferenceId;
  }
  if (input.customerMessage) {
    body.customerMessage = clampPawapayCustomerMessage(input.customerMessage);
  }

  const res = await fetch(`${config.baseUrl}/v2/payouts`, {
    method: "POST",
    headers: authHeaders(config.apiToken),
    body: JSON.stringify(body),
  });

  const rawBody = await readResponseText(res);
  const parsed = tryParseJsonBody(rawBody) as
    | (PawapayPayoutInitiationResponse & {
        failureCode?: string;
        failureMessage?: string;
      })
    | undefined;

  if (res.status >= 500) {
    throw pawapayHttpError(
      "initiatePayout",
      res.status,
      rawBody,
      parsed,
      pawapayFailureCode(parsed) ?? "UNKNOWN_ERROR"
    );
  }

  if (!res.ok) {
    throw pawapayHttpError("initiatePayout", res.status, rawBody, parsed);
  }

  const data =
    parsed ??
    parseJsonText<PawapayPayoutInitiationResponse>(rawBody, "initiatePayout");

  if (data.status === "ACCEPTED" || data.status === "DUPLICATE_IGNORED") {
    return data;
  }

  if (data.status === "REJECTED") {
    throw pawapayHttpError(
      "initiatePayout",
      res.status,
      rawBody,
      data,
      pawapayFailureCode(data)
    );
  }

  throw pawapayHttpError(
    "initiatePayout",
    res.status,
    rawBody,
    data,
    `unexpected_status:${String(data.status)}`
  );
}

/** GET /v2/payouts/{payoutId} — check payout status. */
export async function pawapayCheckPayoutStatus(
  config: PawapayConfig,
  payoutId: string
): Promise<PawapayPayoutCheckResponse> {
  const res = await fetch(
    `${config.baseUrl}/v2/payouts/${encodeURIComponent(payoutId)}`,
    {
      method: "GET",
      headers: authHeaders(config.apiToken),
    }
  );

  const rawBody = await readResponseText(res);
  const parsed = tryParseJsonBody(rawBody);

  if (!res.ok) {
    throw pawapayHttpError("checkPayoutStatus", res.status, rawBody, parsed);
  }

  return parseJsonText<PawapayPayoutCheckResponse>(rawBody, "checkPayoutStatus");
}
