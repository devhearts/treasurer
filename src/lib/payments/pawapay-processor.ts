import {
  pawapayCheckDepositStatus,
  pawapayPredictCorrespondent,
  pawapayRequestDeposit,
} from "@/lib/pawapay/client";
import { getPawapayConfig } from "@/lib/pawapay/config";
import type {
  PaymentProcessor,
  PaymentStatusBody,
  RequestToPayParams,
} from "./types";

/** pawaPay `statementDescription`: 4–22 chars, `[a-zA-Z0-9 ]+`. */
function statementDesc(payeeNote: string, payerMessage: string): string {
  const raw = (payeeNote || payerMessage || "Fund")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const s = raw.slice(0, 22);
  if (s.length >= 4) return s;
  return "Fund";
}

export function createPawapayProcessor(): PaymentProcessor {
  return {
    kind: "pawapay",
    supportedNetworks: ["mtn", "airtel"],
    isConfigured() {
      return getPawapayConfig() !== null;
    },
    getCurrency() {
      return getPawapayConfig()?.currency ?? null;
    },
    async requestToPay(params: RequestToPayParams): Promise<void> {
      const config = getPawapayConfig();
      if (!config) throw new Error("PawaPay is not configured");

      const prediction = await pawapayPredictCorrespondent(params.payerMsisdn);

      const customerTimestamp = new Date().toISOString().replace(
        /\.\d{3}Z$/,
        "Z"
      );

      await pawapayRequestDeposit({
        depositId: params.referenceId,
        amount: String(Math.round(params.amount)),
        currency: config.currency,
        country: config.country ?? prediction.country,
        correspondent: prediction.correspondent,
        payerMsisdn: prediction.msisdn,
        customerTimestamp,
        statementDescription: statementDesc(
          params.payeeNote,
          params.payerMessage
        ),
        metadata: [
          { fieldName: "externalId", fieldValue: params.externalId.slice(0, 200) },
        ],
      });
    },
    async getPaymentStatus(referenceId: string): Promise<PaymentStatusBody> {
      const rows = await pawapayCheckDepositStatus(referenceId);
      if (rows.length === 0) {
        return { status: "PENDING" };
      }
      const d = rows[0]!;
      if (d.status === "COMPLETED") {
        return { status: "SUCCESSFUL" };
      }
      if (d.status === "FAILED") {
        const msg =
          d.failureReason?.failureMessage ||
          d.failureReason?.failureCode ||
          "Payment failed.";
        return {
          status: "FAILED",
          reason: {
            message: msg,
            code: d.failureReason?.failureCode,
          },
        };
      }
      return { status: d.status };
    },
  };
}
