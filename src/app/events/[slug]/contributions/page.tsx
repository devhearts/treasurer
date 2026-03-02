import { notFound } from "next/navigation";
import { getEventBySlug } from "@/app/actions/events";
import ContributionsPageContent from "./ContributionsPageContent";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventContributionsPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return <ContributionsPageContent event={event} />;
}
