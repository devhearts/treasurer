import type { MomoDisbursementConfig } from "./momo.disbursement.config";
import {
  formatMomoGatewayError,
  MOMO_HTTP_USER_AGENT,
  readMomoJson,
} from "./momo.http";
import {
  PaymentProcessorHttpError,
  tryParseJsonBody,
} from "./payment-processor-error.util";

export interface DisbursementTransferStatusBody {
  status: string;
  reason?: { code?: string; message?: string };
  financialTransactionId?: string;
}

function disbursementHeaders(
  config: MomoDisbursementConfig
): Record<string, string> {
  return {
    Accept: "application/json",
    "Ocp-Apim-Subscription-Key": config.disbursementSubscriptionKey,
    "X-Target-Environment": config.targetEnvironment,
    "User-Agent": MOMO_HTTP_USER_AGENT,
  };
}

async function getDisbursementAccessToken(
  config: MomoDisbursementConfig
): Promise<string> {
  const basic = Buffer.from(
    `${config.disbursementApiUser}:${config.disbursementApiKey}`,
    "utf8"
  ).toString("base64");

  const res = await fetch(`${config.baseUrl}/disbursement/token/`, {
    method: "POST",
    headers: {
      ...disbursementHeaders(config),
      Authorization: `Basic ${basic}`,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new PaymentProcessorHttpError(
      `MoMo disbursement token error ${res.status}: ${formatMomoGatewayError(text)}`,
      {
        provider: "momo",
        operation: "disbursementToken",
        httpStatus: res.status,
        rawBody: text,
        parsedBody: tryParseJsonBody(text),
      }
    );
  }

  const data = (() => {
    try {
      return JSON.parse(text) as { access_token: string };
    } catch {
      throw new PaymentProcessorHttpError(
        `MoMo disbursement token: ${formatMomoGatewayError(text)}`,
        {
          provider: "momo",
          operation: "disbursementToken",
          httpStatus: res.status,
          rawBody: text,
        }
      );
    }
  })();
  if (!data.access_token) {
    throw new Error("MoMo disbursement token response missing access_token");
  }
  return data.access_token;
}

export async function momoDisbursementTransfer(
  config: MomoDisbursementConfig,
  params: {
    referenceId: string;
    amount: number;
    currency: string;
    externalId: string;
    payeeMsisdn: string;
    payerMessage: string;
    payeeNote: string;
  }
): Promise<void> {
  const token = await getDisbursementAccessToken(config);
  const amountStr = String(Math.round(params.amount));

  const res = await fetch(
    `${config.baseUrl}/disbursement/v1_0/transfer`,
    {
      method: "POST",
      headers: {
        ...disbursementHeaders(config),
        Authorization: `Bearer ${token}`,
        "X-Reference-Id": params.referenceId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountStr,
        currency: params.currency,
        externalId: params.externalId,
        payee: {
          partyIdType: "MSISDN",
          partyId: params.payeeMsisdn,
        },
        payerMessage: params.payerMessage,
        payeeNote: params.payeeNote,
      }),
    }
  );

  if (res.status === 202) return;

  const text = await res.text();
  throw new PaymentProcessorHttpError(
    `MoMo transfer ${res.status}: ${formatMomoGatewayError(text)}`,
    {
      provider: "momo",
      operation: "disbursementTransfer",
      httpStatus: res.status,
      rawBody: text,
      parsedBody: tryParseJsonBody(text),
    }
  );
}

export async function momoGetDisbursementTransferStatus(
  config: MomoDisbursementConfig,
  referenceId: string
): Promise<DisbursementTransferStatusBody> {
  const token = await getDisbursementAccessToken(config);
  const res = await fetch(
    `${config.baseUrl}/disbursement/v1_0/transfer/${referenceId}`,
    {
      method: "GET",
      headers: {
        ...disbursementHeaders(config),
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const text = await res.text();
  if (!res.ok) {
    throw new PaymentProcessorHttpError(
      `MoMo transfer status ${res.status}: ${formatMomoGatewayError(text)}`,
      {
        provider: "momo",
        operation: "disbursementTransferStatus",
        httpStatus: res.status,
        rawBody: text,
        parsedBody: tryParseJsonBody(text),
      }
    );
  }

  try {
    return JSON.parse(text) as DisbursementTransferStatusBody;
  } catch {
    throw new PaymentProcessorHttpError(
      `MoMo transfer status: ${formatMomoGatewayError(text)}`,
      {
        provider: "momo",
        operation: "disbursementTransferStatus",
        httpStatus: res.status,
        rawBody: text,
      }
    );
  }
}
