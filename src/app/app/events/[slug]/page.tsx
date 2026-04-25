import { notFound } from "next/navigation";
import { getEventBySlug } from "@/app/actions/events";
import { getCurrentUser } from "@/app/actions/auth";
import EventDetailContent from "./EventDetailContent";
import {
  getPaymentProcessor,
  isPaymentProcessorConfigured,
  paymentCtaLabel,
  paymentNetworksText,
} from "@/lib/payments";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [event, user] = await Promise.all([getEventBySlug(slug), getCurrentUser()]);
  const processor = getPaymentProcessor();

  if (!event) notFound();
  // Only owner can view event in app (by slug)
  if (event.userId && user?.id !== event.userId) notFound();

  return (
    <EventDetailContent
      event={event}
      isPublicView={false}
      momoConfigured={isPaymentProcessorConfigured()}
      payButtonLabel={paymentCtaLabel(processor.kind)}
      payerPhoneLabel={`${paymentNetworksText(processor.supportedNetworks)} number (paying wallet)`}
    />
  );
}
