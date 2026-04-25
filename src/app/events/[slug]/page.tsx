import { notFound } from "next/navigation";
import { getEventBySlug } from "@/app/actions/events";
import EventDetailContent from "@/app/app/events/[slug]/EventDetailContent";
import {
  getPaymentProcessor,
  isPaymentProcessorConfigured,
  paymentCtaLabel,
  paymentNetworksText,
} from "@/lib/payments";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Public event page: accessible via shared link without logging in.
 * Copy link / Share from the app use this URL (/events/[slug]).
 */
export default async function PublicEventPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  const processor = getPaymentProcessor();

  if (!event) notFound();

  return (
    <EventDetailContent
      event={event}
      isPublicView
      momoConfigured={isPaymentProcessorConfigured()}
      payButtonLabel={paymentCtaLabel(processor.kind)}
      payerPhoneLabel={`${paymentNetworksText(processor.supportedNetworks)} number (paying wallet)`}
    />
  );
}
