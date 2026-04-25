import CreateEventForm from "./CreateEventForm";
import {
  getPaymentProcessor,
  isPaymentProcessorConfigured,
  paymentCtaLabel,
  paymentNetworksText,
} from "@/lib/payments";

export const metadata = {
  title: "Create Event – CeremonyWallet",
};

export default function CreatePage() {
  const processor = getPaymentProcessor();
  return (
    <main className="min-h-screen bg-light">
      <div className="max-w-lg mx-auto px-4 py-8">
        <CreateEventForm
          momoConfigured={isPaymentProcessorConfigured()}
          payButtonLabel={paymentCtaLabel(processor.kind)}
          payerPhoneLabel={`${paymentNetworksText(processor.supportedNetworks)} number (paying wallet)`}
        />
      </div>
    </main>
  );
}
