import type { MomoConfig } from "./momo.config";
import {
  formatMomoGatewayError,
  momoCollectionHeaders,
  readMomoJson,
} from "./momo.http";

export interface RequestToPayStatusBody {
  status: string;
  reason?: { code?: string; message?: string };
  financialTransactionId?: string;
}

async function getCollectionAccessToken(config: MomoConfig): Promise<string> {
  const basic = Buffer.from(
    `${config.apiUser}:${config.apiKey}`,
    "utf8"
  ).toString("base64");

  const res = await fetch(`${config.baseUrl}/collection/token/`, {
    method: "POST",
    headers: {
      ...momoCollectionHeaders(config),
      Authorization: `Basic ${basic}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `MoMo token error ${res.status}: ${formatMomoGatewayError(text)}`
    );
  }

  const data = await readMomoJson<{ access_token: string }>(res, "MoMo token");
  if (!data.access_token) {
    throw new Error("MoMo token response missing access_token");
  }
  return data.access_token;
}

export async function momoRequestToPay(
  config: MomoConfig,
  params: {
    referenceId: string;
    amount: number;
    currency: string;
    externalId: string;
    payerMsisdn: string;
    payerMessage: string;
    payeeNote: string;
  }
): Promise<void> {
  const token = await getCollectionAccessToken(config);
  const amountStr = String(Math.round(params.amount));

  const res = await fetch(`${config.baseUrl}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers: {
      ...momoCollectionHeaders(config),
      Authorization: `Bearer ${token}`,
      "X-Reference-Id": params.referenceId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountStr,
      currency: params.currency,
      externalId: params.externalId,
      payer: {
        partyIdType: "MSISDN",
        partyId: params.payerMsisdn,
      },
      payerMessage: params.payerMessage,
      payeeNote: params.payeeNote,
    }),
  });

  if (res.status === 202) return;

  const text = await res.text();
  throw new Error(
    `MoMo requestToPay ${res.status}: ${formatMomoGatewayError(text)}`
  );
}

export async function momoGetRequestToPayStatus(
  config: MomoConfig,
  referenceId: string
): Promise<RequestToPayStatusBody> {
  const token = await getCollectionAccessToken(config);
  const res = await fetch(
    `${config.baseUrl}/collection/v1_0/requesttopay/${referenceId}`,
    {
      method: "GET",
      headers: {
        ...momoCollectionHeaders(config),
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `MoMo status ${res.status}: ${formatMomoGatewayError(text)}`
    );
  }

  return readMomoJson<RequestToPayStatusBody>(
    res,
    "MoMo requestToPay status"
  );
}
