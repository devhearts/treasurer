import {
  getRequestToPayStatus,
  requestToPay as momoRequestToPay,
} from "@/lib/momo/client";
import { getMomoConfig } from "@/lib/momo/config";
import type {
  PaymentProcessor,
  PaymentStatusBody,
  RequestToPayParams,
} from "./types";

export function createMtnMomoProcessor(): PaymentProcessor {
  return {
    kind: "mtn_momo",
    supportedNetworks: ["mtn"],
    isConfigured() {
      return getMomoConfig() !== null;
    },
    getCurrency() {
      return getMomoConfig()?.currency ?? null;
    },
    async requestToPay(params: RequestToPayParams) {
      const config = getMomoConfig();
      if (!config) throw new Error("MoMo is not configured");
      await momoRequestToPay({
        referenceId: params.referenceId,
        amount: params.amount,
        currency: config.currency,
        externalId: params.externalId,
        payerMsisdn: params.payerMsisdn,
        payerMessage: params.payerMessage,
        payeeNote: params.payeeNote,
      });
    },
    async getPaymentStatus(referenceId: string): Promise<PaymentStatusBody> {
      const body = await getRequestToPayStatus(referenceId);
      return { status: body.status, reason: body.reason };
    },
  };
}
