import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  port: parseInt(process.env.PORT ?? "4000", 10),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  /** Public web URL for links in emails (verify, password reset). */
  nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
  internalProxySecret: process.env.INTERNAL_PROXY_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  paymentProcessorType: (
    process.env.PAYMENT_PROCESSOR_TYPE ?? "mtn_momo"
  ).toLowerCase(),
  featureSubscriptionPayment:
    process.env.FEATURE_SUBSCRIPTION_PAYMENT === "1" ||
    process.env.FEATURE_SUBSCRIPTION_PAYMENT === "true",
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.MAIL_FROM ?? "CeremonyWallet <noreply@ceremonywallet.com>",
  },
  /** Inbox for account-verification submission alerts (optional). */
  supportEmail: process.env.SUPPORT_EMAIL ?? "",
  garage: {
    endpoint: process.env.GARAGE_ENDPOINT ?? "",
    region: process.env.GARAGE_REGION ?? "garage",
    accessKey: process.env.GARAGE_ACCESS_KEY ?? "",
    secretKey: process.env.GARAGE_SECRET_KEY ?? "",
    bucket: process.env.GARAGE_BUCKET ?? "",
  },
  africastalking: {
    username: process.env.AFRICASTALKING_USERNAME ?? "",
    apiKey: process.env.AFRICASTALKING_API_KEY ?? "",
    senderId: process.env.AFRICASTALKING_SENDER_ID ?? "",
  },
  fees: {
    /** Base % for tiered MoMo withdraw fee (band levies are fixed in wallet-fees.ts). */
    momoFeePercent: parseFloat(process.env.MOMO_FEE_PERCENT ?? "0.04"),
    platformFeeRate: parseFloat(
      process.env.PLATFORM_FEE_RATE ?? "0.012"
    ),
    eventCreationFee: parseInt(
      process.env.EVENT_CREATION_FEE ?? "10000",
      10
    ),
  },
  withdraw: {
    enabled:
      process.env.WITHDRAW_ENABLED === "1" ||
      process.env.WITHDRAW_ENABLED === "true",
    otpTtlSec: parseInt(process.env.WITHDRAW_OTP_TTL_SEC ?? "300", 10),
    otpResendSec: parseInt(process.env.WITHDRAW_OTP_RESEND_SEC ?? "45", 10),
  },
}));
