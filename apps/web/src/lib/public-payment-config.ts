import "server-only";
import { serverApiJsonInternal } from "./server-api";
import type { PaymentProcessorKind } from "./payments/types";

export type PublicPaymentConfig = {
  paymentsConfigured: boolean;
  processorKind: PaymentProcessorKind;
  subscriptionFeature: boolean;
};

export async function loadPublicPaymentConfig(): Promise<PublicPaymentConfig> {
  try {
    return await serverApiJsonInternal<PublicPaymentConfig>("public/config", {
      method: "GET",
    });
  } catch {
    const raw = process.env.NEXT_PUBLIC_FEATURE_SUBSCRIPTION_PAYMENT?.trim().toLowerCase();
    return {
      paymentsConfigured: false,
      processorKind: "mtn_momo",
      subscriptionFeature: raw === "1" || raw === "true",
    };
  }
}
