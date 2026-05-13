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
  absoluteFirstEventImageUrl,
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
  const ogImage = absoluteFirstEventImageUrl(event);
  const hasOgImage = Boolean(ogImage);
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
      ...(hasOgImage && ogImage
        ? { images: [{ url: ogImage, alt: ogTitle }] }
        : {}),
    },
    twitter: {
      card: hasOgImage ? "summary_large_image" : "summary",
      title: ogTitle,
      description,
      ...(hasOgImage && ogImage ? { images: [ogImage] } : {}),
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
