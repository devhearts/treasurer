import { getMomoConfig } from "./config";

export interface RequestToPayStatusBody {
  status: string;
  reason?: { code?: string; message?: string };
  financialTransactionId?: string;
}

async function getCollectionAccessToken(): Promise<string> {
  const config = getMomoConfig();
  if (!config) throw new Error("MoMo is not configured");

  const basic = Buffer.from(
    `${config.apiUser}:${config.apiKey}`,
    "utf8"
  ).toString("base64");

  const res = await fetch(`${config.baseUrl}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Ocp-Apim-Subscription-Key": config.subscriptionKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MoMo token error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function requestToPay(params: {
  referenceId: string;
  amount: number;
  currency: string;
  externalId: string;
  payerMsisdn: string;
  payerMessage: string;
  payeeNote: string;
}): Promise<void> {
  const config = getMomoConfig();
  if (!config) throw new Error("MoMo is not configured");

  const token = await getCollectionAccessToken();
  const amountStr = String(Math.round(params.amount));
  console.log("body", JSON.stringify({
    amount: amountStr,
    currency: params.currency,
    externalId: params.externalId,
    payer: {
      partyIdType: "MSISDN",
      partyId: params.payerMsisdn,
    },
    payerMessage: params.payerMessage,
    payeeNote: params.payeeNote,
  }));

  const res = await fetch(
    `${config.baseUrl}/collection/v1_0/requesttopay`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Reference-Id": params.referenceId,
        "X-Target-Environment": config.targetEnvironment,
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
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
    }
  );

  if (res.status === 202) return;

  const text = await res.text();
  throw new Error(`MoMo requestToPay ${res.status}: ${text}`);
}

export async function getRequestToPayStatus(
  referenceId: string
): Promise<RequestToPayStatusBody> {
  const config = getMomoConfig();
  if (!config) throw new Error("MoMo is not configured");

  const token = await getCollectionAccessToken();
  const res = await fetch(
    `${config.baseUrl}/collection/v1_0/requesttopay/${referenceId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Target-Environment": config.targetEnvironment,
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MoMo status ${res.status}: ${text}`);
  }

  return (await res.json()) as RequestToPayStatusBody;
}
