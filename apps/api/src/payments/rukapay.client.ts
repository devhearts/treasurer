import type { RukapayConfig } from "./rukapay.config";
import {
  isAirtelUgandaMsisdn,
  isMtnUgandaMsisdn,
} from "./phone";
import {
  PaymentProcessorHttpError,
  tryParseJsonBody,
} from "./payment-processor-error.util";
import {
  parseJsonText,
  rukapayAuthHeaders,
  rukapayErrorMessageFromText,
} from "./rukapay.http";

export type RukapayTransactionMode =
  | "PARTNER_SEND_MNO"
  | "PARTNER_COLLECT_MNO"
  | "PARTNER_RECEIVE_MNO";

export type RukapayMnoProvider = "MTN" | "AIRTEL";

export type RukapayTransactionStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED";

export interface RukapayTransaction {
  transactionId?: string;
  reference?: string;
  partnerReference?: string;
  amount?: number;
  fee?: number;
  totalCharged?: number;
  totalAmount?: number;
  currency?: string;
  status?: RukapayTransactionStatus | string;
  narration?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface RukapayProcessTransferResponse {
  success: boolean;
  message?: string;
  error?: string;
  transaction?: RukapayTransaction;
}

export interface RukapayValidateBeneficiaryResponse {
  success: boolean;
  message?: string;
  error?: string;
  beneficiary?: {
    name?: string;
    phoneNumber?: string;
    provider?: string;
    isValid?: boolean;
  };
}

export interface RukapayTransactionStatusResponse {
  success: boolean;
  message?: string;
  error?: string;
  transaction?: RukapayTransaction;
}

function processTransferPath(config: RukapayConfig): string {
  const suffix = config.sandbox ? "process-transfer-sandbox" : "process-transfer";
  return `${config.baseUrl}/${suffix}`;
}

function validateBeneficiaryPath(config: RukapayConfig): string {
  const suffix = config.sandbox
    ? "validate-beneficiary-sandbox"
    : "validate-beneficiary";
  return `${config.baseUrl}/${suffix}`;
}

export function rukapayMnoProvider(msisdn: string): RukapayMnoProvider {
  if (isMtnUgandaMsisdn(msisdn)) return "MTN";
  if (isAirtelUgandaMsisdn(msisdn)) return "AIRTEL";
  throw new Error("Phone number is not a supported MTN or Airtel Uganda number.");
}

async function throwRukapayHttpError(
  res: Response,
  operation: string,
  rawBody: string
): Promise<never> {
  const parsed = tryParseJsonBody(rawBody);
  const msg = rukapayErrorMessageFromText(rawBody, res.status);
  throw new PaymentProcessorHttpError(msg, {
    provider: "rukapay",
    operation,
    httpStatus: res.status,
    rawBody,
    parsedBody: parsed,
  });
}

export async function rukapayProcessTransfer(
  config: RukapayConfig,
  body: Record<string, unknown>
): Promise<RukapayProcessTransferResponse> {
  const res = await fetch(processTransferPath(config), {
    method: "POST",
    headers: rukapayAuthHeaders(config.apiKey),
    body: JSON.stringify(body),
  });

  const rawBody = await res.text();
  if (!res.ok) {
    await throwRukapayHttpError(res, "processTransfer", rawBody);
  }

  const data = parseJsonText<RukapayProcessTransferResponse>(
    rawBody,
    "processTransfer body"
  );
  if (!data.success) {
    const msg =
      data.message || data.error || "RukaPay transfer request failed.";
    throw new PaymentProcessorHttpError(msg, {
      provider: "rukapay",
      operation: "processTransfer",
      httpStatus: res.status,
      rawBody,
      parsedBody: data,
    });
  }
  return data;
}

export async function rukapayValidateBeneficiary(
  config: RukapayConfig,
  input: {
    phoneNumber: string;
    mnoProvider: RukapayMnoProvider;
    reference?: string;
  }
): Promise<RukapayValidateBeneficiaryResponse> {
  const body: Record<string, unknown> = {
    transactionMode: "PARTNER_SEND_MNO",
    phoneNumber: input.phoneNumber,
    mnoProvider: input.mnoProvider,
  };
  if (input.reference) body.reference = input.reference;

  const res = await fetch(validateBeneficiaryPath(config), {
    method: "POST",
    headers: rukapayAuthHeaders(config.apiKey),
    body: JSON.stringify(body),
  });

  const rawBody = await res.text();
  if (!res.ok) {
    await throwRukapayHttpError(res, "validateBeneficiary", rawBody);
  }

  const data = parseJsonText<RukapayValidateBeneficiaryResponse>(
    rawBody,
    "validateBeneficiary body"
  );
  if (!data.success || data.beneficiary?.isValid === false) {
    const msg =
      data.message || data.error || "Beneficiary validation failed.";
    throw new PaymentProcessorHttpError(msg, {
      provider: "rukapay",
      operation: "validateBeneficiary",
      httpStatus: res.status,
      rawBody,
      parsedBody: data,
    });
  }
  return data;
}

export async function rukapayGetTransactionStatus(
  config: RukapayConfig,
  partnerReference: string
): Promise<RukapayTransactionStatusResponse | null> {
  const url = `${config.baseUrl}/transactions/${encodeURIComponent(partnerReference)}/status`;
  const res = await fetch(url, {
    method: "GET",
    headers: rukapayAuthHeaders(config.apiKey),
  });

  const rawBody = await res.text();
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    await throwRukapayHttpError(res, "getTransactionStatus", rawBody);
  }

  const data = parseJsonText<RukapayTransactionStatusResponse>(
    rawBody,
    "getTransactionStatus body"
  );
  if (!data.success) {
    if (data.error === "TRANSACTION_NOT_FOUND") return null;
    const msg =
      data.message || data.error || "Failed to retrieve transaction status.";
    throw new PaymentProcessorHttpError(msg, {
      provider: "rukapay",
      operation: "getTransactionStatus",
      httpStatus: res.status,
      rawBody,
      parsedBody: data,
    });
  }
  return data;
}

export async function rukapayCollectFromMno(
  config: RukapayConfig,
  input: {
    phoneNumber: string;
    mnoProvider: RukapayMnoProvider;
    amount: number;
    partnerReference: string;
    narration: string;
  }
): Promise<void> {
  if (!config.callbackUrl) {
    throw new Error(
      "RukaPay callback URL is not configured (set RUKAPAY_CALLBACK_URL or WEB_ORIGIN)."
    );
  }
  await rukapayProcessTransfer(config, {
    transactionMode: "PARTNER_COLLECT_MNO",
    amount: Math.round(input.amount),
    currency: config.currency,
    phoneNumber: input.phoneNumber,
    mnoProvider: input.mnoProvider,
    narration: input.narration,
    partnerReference: input.partnerReference,
    callbackUrl: config.callbackUrl,
  });
}

export async function rukapaySendToMno(
  config: RukapayConfig,
  input: {
    phoneNumber: string;
    mnoProvider: RukapayMnoProvider;
    amount: number;
    partnerReference: string;
    recipientName: string;
    narration: string;
  }
): Promise<void> {
  await rukapayProcessTransfer(config, {
    transactionMode: "PARTNER_SEND_MNO",
    amount: Math.round(input.amount),
    currency: config.currency,
    phoneNumber: input.phoneNumber,
    mnoProvider: input.mnoProvider,
    recipientName: input.recipientName,
    narration: input.narration,
    partnerReference: input.partnerReference,
    walletType: config.walletType,
  });
}
