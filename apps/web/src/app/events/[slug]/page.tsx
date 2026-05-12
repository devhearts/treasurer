import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventDetailContent from "@/app/app/events/[slug]/EventDetailContent";
import {
  paymentCtaLabel,
  paymentNetworksForKind,
  paymentNetworksText,
} from "@/lib/payments";
import { loadPublicPaymentConfig } from "@/lib/public-payment-config";
import { loadPublicEventBySlug } from "./load-public-event";
import {
  absolutePublicEventUrl,
  buildEventOgDescription,
  eventShareTitle,
} from "@/lib/event-share";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await loadPublicEventBySlug(slug);
  if (!event) {
    return { title: "Event · CeremonyWallet" };
  }
  const url = absolutePublicEventUrl(event.slug);
  const title = eventShareTitle(event);
  const description = buildEventOgDescription(event);
  const ogTitle = event.title.trim() || title;
  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: "CeremonyWallet",
      type: "website",
      locale: "en_UG",
    },
    twitter: {
      card: "summary",
      title: ogTitle,
      description,
    },
    alternates: { canonical: url },
  };
}

/**
 * Public event page: accessible via shared link without logging in.
 * Copy link / Share from the app use this URL (/events/[slug]).
 */
export default async function PublicEventPage({ params }: PageProps) {
  const { slug } = await params;
  const [event, cfg] = await Promise.all([
    loadPublicEventBySlug(slug),
    loadPublicPaymentConfig(),
  ]);
  const networks = paymentNetworksForKind(cfg.processorKind);

  if (!event) notFound();

  return (
    <EventDetailContent
      key={event.id}
      event={event}
      isPublicView
      momoConfigured={cfg.paymentsConfigured}
      paymentProcessorKind={cfg.processorKind}
      payButtonLabel={paymentCtaLabel(cfg.processorKind)}
      payerPhoneLabel={`${paymentNetworksText(networks)} number (paying wallet)`}
    />
  );
}
