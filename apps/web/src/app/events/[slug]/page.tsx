import { notFound } from "next/navigation";
import { getEventBySlug } from "@/app/actions/events";
import EventDetailContent from "@/app/app/events/[slug]/EventDetailContent";
import {
  paymentCtaLabel,
  paymentNetworksForKind,
  paymentNetworksText,
} from "@/lib/payments";
import { loadPublicPaymentConfig } from "@/lib/public-payment-config";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Public event page: accessible via shared link without logging in.
 * Copy link / Share from the app use this URL (/events/[slug]).
 */
export default async function PublicEventPage({ params }: PageProps) {
  const { slug } = await params;
  const [event, cfg] = await Promise.all([
    getEventBySlug(slug),
    loadPublicPaymentConfig(),
  ]);
  const networks = paymentNetworksForKind(cfg.processorKind);

  if (!event) notFound();

  return (
    <EventDetailContent
      event={event}
      isPublicView
      momoConfigured={cfg.paymentsConfigured}
      paymentProcessorKind={cfg.processorKind}
      payButtonLabel={paymentCtaLabel(cfg.processorKind)}
      payerPhoneLabel={`${paymentNetworksText(networks)} number (paying wallet)`}
    />
  );
}
