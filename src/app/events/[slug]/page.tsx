import { notFound } from "next/navigation";
import { getEventBySlug } from "@/app/actions/events";
import EventDetailContent from "@/app/app/events/[slug]/EventDetailContent";
import { isMomoConfigured } from "@/lib/momo/config";

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

  if (!event) notFound();

  return (
    <EventDetailContent
      event={event}
      isPublicView
      momoConfigured={isMomoConfigured()}
    />
  );
}
