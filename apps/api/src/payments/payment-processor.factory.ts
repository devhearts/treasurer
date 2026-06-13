import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { MomoConfig } from "./momo.config";
import { momoConfigFromApp } from "./momo.config";
import {
  momoGetRequestToPayStatus,
  momoRequestToPay,
} from "./momo.client";
import type { PawapayConfig } from "./pawapay.config";
import { pawapayConfigFromApp } from "./pawapay.config";
import {
  pawapayCheckDepositStatus,
  pawapayPredictCorrespondent,
  pawapayRequestDeposit,
} from "./pawapay.client";
import { getPaymentProcessorType } from "./payment-processor-type";
import type {
  PaymentProcessor,
  PaymentStatusBody,
  RequestToPayParams,
} from "./payment.types";

function statementDesc(payeeNote: string, payerMessage: string): string {
  const raw = (payeeNote || payerMessage || "Fund")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const s = raw.slice(0, 22);
  if (s.length >= 4) return s;
  return "Fund";
}

@Injectable()
export class PaymentProcessorFactory {
  constructor(private readonly config: ConfigService) {}

  getProcessorType(): "mtn_momo" | "pawapay" {
    return getPaymentProcessorType(this.config);
  }

  getProcessor(): PaymentProcessor {
    return this.getProcessorByKind(this.getProcessorType());
  }

  getProcessorByKind(kind: "mtn_momo" | "pawapay"): PaymentProcessor {
    if (kind === "pawapay") {
      return this.createPawapay();
    }
    return this.createMtnMomo();
  }

  private createMtnMomo(): PaymentProcessor {
    const cfg = (): MomoConfig | null => momoConfigFromApp(this.config);
    return {
      kind: "mtn_momo",
      supportedNetworks: ["mtn"],
      isConfigured: () => cfg() !== null,
      getCurrency: () => cfg()?.currency ?? null,
      requestToPay: async (params: RequestToPayParams) => {
        const c = cfg();
        if (!c) throw new Error("MoMo is not configured");
        await momoRequestToPay(c, {
          referenceId: params.referenceId,
          amount: params.amount,
          currency: c.currency,
          externalId: params.externalId,
          payerMsisdn: params.payerMsisdn,
          payerMessage: params.payerMessage,
          payeeNote: params.payeeNote,
        });
      },
      getPaymentStatus: async (referenceId: string) => {
        const c = cfg();
        if (!c) throw new Error("MoMo is not configured");
        const body = await momoGetRequestToPayStatus(c, referenceId);
        return {
          status: body.status,
          reason: body.reason,
          rawPayload: body as unknown as Record<string, unknown>,
        };
      },
    };
  }

  private createPawapay(): PaymentProcessor {
    const cfg = (): PawapayConfig | null => pawapayConfigFromApp(this.config);
    return {
      kind: "pawapay",
      supportedNetworks: ["mtn", "airtel"],
      isConfigured: () => cfg() !== null,
      getCurrency: () => cfg()?.currency ?? null,
      requestToPay: async (params: RequestToPayParams) => {
        const c = cfg();
        if (!c) throw new Error("PawaPay is not configured");
        const prediction = await pawapayPredictCorrespondent(
          c,
          params.payerMsisdn
        );
        const customerTimestamp = new Date().toISOString().replace(
          /\.\d{3}Z$/,
          "Z"
        );
        await pawapayRequestDeposit(c, {
          depositId: params.referenceId,
          amount: String(Math.round(params.amount)),
          currency: c.currency,
          country: c.country ?? prediction.country,
          correspondent: prediction.correspondent,
          payerMsisdn: prediction.msisdn,
          customerTimestamp,
          statementDescription: statementDesc(
            params.payeeNote,
            params.payerMessage
          ),
          metadata: [
            {
              fieldName: "externalId",
              fieldValue: params.externalId.slice(0, 200),
            },
          ],
        });
      },
      getPaymentStatus: async (referenceId: string) => {
        const c = cfg();
        if (!c) throw new Error("PawaPay is not configured");
        const rows = await pawapayCheckDepositStatus(c, referenceId);
        if (rows.length === 0) {
          return { status: "PENDING", rawPayload: null };
        }
        const d = rows[0]!;
        const rawPayload = d as unknown as Record<string, unknown>;
        if (d.status === "FAILED") {
          const msg =
            d.failureReason?.failureMessage ||
            d.failureReason?.failureCode ||
            "Payment failed.";
          return {
            status: d.status,
            reason: {
              message: msg,
              code: d.failureReason?.failureCode,
            },
            rawPayload,
          };
        }
        return { status: d.status, rawPayload };
      },
    };
  }
}
