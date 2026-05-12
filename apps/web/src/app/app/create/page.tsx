import CreateEventForm from "./CreateEventForm";
import {
  paymentCtaLabel,
  paymentNetworksForKind,
  paymentNetworksText,
} from "@/lib/payments";
import { loadPublicPaymentConfig } from "@/lib/public-payment-config";

export const metadata = {
  title: "Create Event – CeremonyWallet",
};

export default async function CreatePage() {
  const cfg = await loadPublicPaymentConfig();
  const networks = paymentNetworksForKind(cfg.processorKind);
  return (
    <main className="min-h-screen bg-light">
      <div className="max-w-lg mx-auto px-4 py-8">
        <CreateEventForm
          momoConfigured={cfg.paymentsConfigured}
          subscriptionPaymentEnabled={cfg.subscriptionFeature}
          paymentProcessorKind={cfg.processorKind}
          payButtonLabel={paymentCtaLabel(cfg.processorKind)}
          payerPhoneLabel={`${paymentNetworksText(networks)} number (paying wallet)`}
        />
      </div>
    </main>
  );
}
