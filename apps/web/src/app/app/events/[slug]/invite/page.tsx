import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventBySlug } from "@/app/actions/events";
import InviteCardGenerator from "./InviteCardGenerator";
import { IconBack } from "@/components/Icons";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event || event.type !== "wedding") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-light">
      <div className="max-w-lg mx-auto px-4 py-6">
        <Link
          href={`/app/events/${slug}`}
          className="inline-flex items-center gap-1 text-muted hover:text-surface text-sm mb-4"
        >
          <IconBack className="w-4 h-4" />
          <span className="sm:hidden">Back</span>
          <span className="hidden sm:inline">Back to event</span>
        </Link>
        <h1 className="text-xl font-bold text-surface mb-1">
          <span className="sm:hidden">Invitations</span>
          <span className="hidden sm:inline">Invitation cards</span>
        </h1>
        <p className="text-muted text-sm mb-6">{event.title}</p>
        <InviteCardGenerator event={event} />
      </div>
    </main>
  );
}
