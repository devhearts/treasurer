import { notFound } from "next/navigation";
import { getEventBySlug } from "@/app/actions/events";
import { getCurrentUser } from "@/app/actions/auth";
import EventDetailContent from "./EventDetailContent";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [event, user] = await Promise.all([getEventBySlug(slug), getCurrentUser()]);

  if (!event) notFound();
  // Only owner can view event in app (by slug)
  if (event.userId && user?.id !== event.userId) notFound();

  return <EventDetailContent event={event} isPublicView={false} />;
}
