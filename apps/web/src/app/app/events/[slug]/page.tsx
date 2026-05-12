import { notFound } from "next/navigation";
import { getEventBySlug } from "@/app/actions/events";
import { getCurrentUser } from "@/lib/auth-server";
import EventDetailContent from "./EventDetailContent";
import {
  paymentCtaLabel,
  paymentNetworksForKind,
  paymentNetworksText,
} from "@/lib/payments";
import { loadPublicPaymentConfig } from "@/lib/public-payment-config";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [event, user, cfg] = await Promise.all([
    getEventBySlug(slug),
    getCurrentUser(),
    loadPublicPaymentConfig(),
  ]);
  const networks = paymentNetworksForKind(cfg.processorKind);

  if (!event) notFound();
  // Only owner can view event in app (by slug)
  if (event.userId && user?.id !== event.userId) notFound();

  return (
    <EventDetailContent
      event={event}
      isPublicView={false}
      momoConfigured={cfg.paymentsConfigured}
      paymentProcessorKind={cfg.processorKind}
      payButtonLabel={paymentCtaLabel(cfg.processorKind)}
      payerPhoneLabel={`${paymentNetworksText(networks)} number (paying wallet)`}
    />
  );
}
