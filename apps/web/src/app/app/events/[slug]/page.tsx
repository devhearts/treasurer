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
import { resolveAllocateToMilestoneId } from "@/lib/event-share";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ allocateTo?: string | string[] }>;
}

export default async function EventDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const allocateRaw = sp.allocateTo;
  const allocateParam =
    typeof allocateRaw === "string"
      ? allocateRaw
      : Array.isArray(allocateRaw)
        ? allocateRaw[0]
        : undefined;
  const [event, user, cfg] = await Promise.all([
    getEventBySlug(slug),
    getCurrentUser(),
    loadPublicPaymentConfig(),
  ]);
  const networks = paymentNetworksForKind(cfg.processorKind);

  if (!event) notFound();
  // Only owner can view event in app (by slug)
  if (event.userId && user?.id !== event.userId) notFound();

  const allocateToMilestoneId = resolveAllocateToMilestoneId(
    event,
    allocateParam
  );

  return (
    <EventDetailContent
      key={`${event.id}-${allocateToMilestoneId ?? ""}`}
      event={event}
      isPublicView={false}
      momoConfigured={cfg.paymentsConfigured}
      paymentProcessorKind={cfg.processorKind}
      payButtonLabel={paymentCtaLabel(cfg.processorKind)}
      payerPhoneLabel={`${paymentNetworksText(networks)} number (paying wallet)`}
      allocateToMilestoneId={allocateToMilestoneId}
    />
  );
}
