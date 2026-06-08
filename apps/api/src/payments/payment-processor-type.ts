import { ConfigService } from "@nestjs/config";
import type { PaymentProcessorKind } from "./payment.types";

/** Single source of truth for PAYMENT_PROCESSOR_TYPE (matches PaymentProcessorFactory). */
export function getPaymentProcessorType(
  config: ConfigService
): PaymentProcessorKind {
  const raw = (
    config.get<string>("app.paymentProcessorType") ??
    config.get<string>("PAYMENT_PROCESSOR_TYPE") ??
    process.env.PAYMENT_PROCESSOR_TYPE ??
    "mtn_momo"
  )
    .trim()
    .toLowerCase();
  return raw === "pawapay" ? "pawapay" : "mtn_momo";
}
