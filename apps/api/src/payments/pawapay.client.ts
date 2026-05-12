import type { PawapayConfig } from "./pawapay.config";

export type PawapayDepositCreationStatus =
  | "ACCEPTED"
  | "REJECTED"
  | "DUPLICATE_IGNORED";

export interface PawapayDepositCreationResponse {
  depositId: string;
  status: PawapayDepositCreationStatus;
  created?: string;
  rejectionReason?: {
    rejectionCode?: string;
    rejectionMessage?: string;
  };
}

export interface PawapayErrorResponse {
  errorId: string;
  errorCode: number;
  errorMessage: string;
}

export type PawapayDepositStatus =
  | "ACCEPTED"
  | "SUBMITTED"
  | "COMPLETED"
  | "FAILED";

export interface PawapayDeposit {
  depositId: string;
  status: PawapayDepositStatus;
  requestedAmount: string;
  currency: string;
  country?: string;
  correspondent: string;
  payer: { type: string; address: { value: string } };
  customerTimestamp: string;
  statementDescription?: string;
  created: string;
  failureReason?: {
    failureCode?: string;
    failureMessage?: string;
  };
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function readJson<T>(res: Response, context: string): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${context}: invalid JSON (${res.status})`);
  }
}

async function errorMessageFromResponse(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const err = JSON.parse(text) as PawapayErrorResponse;
    if (err?.errorMessage) return err.errorMessage;
  } catch {
    /* ignore */
  }
  return text.slice(0, 200) || `HTTP ${res.status}`;
}

export interface PawapayCorrespondentPrediction {
  country: string;
  operator: string;
  correspondent: string;
  msisdn: string;
}

export async function pawapayPredictCorrespondent(
  config: PawapayConfig,
  msisdn: string
): Promise<PawapayCorrespondentPrediction> {
  const res = await fetch(`${config.baseUrl}/v1/predict-correspondent`, {
    method: "POST",
    headers: authHeaders(config.apiToken),
    body: JSON.stringify({ msisdn }),
  });

  if (!res.ok) {
    const msg = await errorMessageFromResponse(res);
    throw new Error(`PawaPay predictCorrespondent ${res.status}: ${msg}`);
  }

  const data = await readJson<PawapayCorrespondentPrediction>(
    res,
    "predictCorrespondent body"
  );
  if (!data.correspondent || !data.msisdn) {
    throw new Error("PawaPay predictCorrespondent: missing correspondent or msisdn");
  }
  return data;
}

export async function pawapayRequestDeposit(
  config: PawapayConfig,
  input: {
    depositId: string;
    amount: string;
    currency: string;
    country?: string | null;
    correspondent: string;
    payerMsisdn: string;
    customerTimestamp: string;
    statementDescription: string;
    metadata?: { fieldName: string; fieldValue: string }[];
  }
): Promise<void> {
  const body: Record<string, unknown> = {
    depositId: input.depositId,
    amount: input.amount,
    currency: input.currency,
    correspondent: input.correspondent,
    payer: {
      type: "MSISDN",
      address: { value: input.payerMsisdn },
    },
    customerTimestamp: input.customerTimestamp,
    statementDescription: input.statementDescription,
  };
  if (input.country) body.country = input.country;
  if (input.metadata?.length) body.metadata = input.metadata;

  const res = await fetch(`${config.baseUrl}/deposits`, {
    method: "POST",
    headers: authHeaders(config.apiToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await errorMessageFromResponse(res);
    throw new Error(`PawaPay requestDeposit ${res.status}: ${msg}`);
  }

  const data = await readJson<PawapayDepositCreationResponse>(
    res,
    "requestDeposit body"
  );

  if (data.status === "ACCEPTED" || data.status === "DUPLICATE_IGNORED") {
    return;
  }

  if (data.status === "REJECTED") {
    const r = data.rejectionReason;
    const detail =
      r?.rejectionMessage ||
      r?.rejectionCode ||
      "Deposit request rejected.";
    throw new Error(detail);
  }

  throw new Error(`PawaPay unexpected status: ${String(data.status)}`);
}

export async function pawapayCheckDepositStatus(
  config: PawapayConfig,
  depositId: string
): Promise<PawapayDeposit[]> {
  const res = await fetch(
    `${config.baseUrl}/deposits/${encodeURIComponent(depositId)}`,
    {
      method: "GET",
      headers: authHeaders(config.apiToken),
    }
  );

  if (!res.ok) {
    const msg = await errorMessageFromResponse(res);
    throw new Error(`PawaPay checkDepositStatus ${res.status}: ${msg}`);
  }

  const data = await readJson<PawapayDeposit[] | unknown>(
    res,
    "checkDepositStatus body"
  );
  if (!Array.isArray(data)) {
    throw new Error("PawaPay checkDepositStatus: expected array");
  }
  return data as PawapayDeposit[];
}
