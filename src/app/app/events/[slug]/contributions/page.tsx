import { notFound } from "next/navigation";
import { getEventBySlug } from "@/app/actions/events";
import { getCurrentUser } from "@/app/actions/auth";
import ContributionsPageContent from "./ContributionsPageContent";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventContributionsPage({ params }: PageProps) {
  const { slug } = await params;
  const [event, user] = await Promise.all([
    getEventBySlug(slug),
    getCurrentUser(),
  ]);

  if (!event) {
    notFound();
  }
  if (event.userId && user?.id !== event.userId) {
    notFound();
  }

  return <ContributionsPageContent event={event} />;
}
