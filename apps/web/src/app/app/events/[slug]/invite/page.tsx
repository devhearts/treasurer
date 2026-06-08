import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getEventBySlug } from "@/app/actions/events";
import { getCurrentUser } from "@/lib/auth-server";
import { listInvitations } from "@/app/actions/invitations";
import { IconBack } from "@/components/Icons";
import InvitationsFeed from "./InvitationsFeed";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const metadata = {
  title: "Invitations – CeremonyWallet",
};

export default async function InviteHubPage({ params }: PageProps) {
  const { slug } = await params;
  const [event, user] = await Promise.all([
    getEventBySlug(slug),
    getCurrentUser(),
  ]);

  if (!event) notFound();
  if (event.userId && user?.id !== event.userId) notFound();

  let items: Awaited<ReturnType<typeof listInvitations>> = [];
  let listError: string | null = null;
  try {
    items = await listInvitations(slug);
  } catch (e) {
    listError =
      e instanceof Error ? e.message : "Could not load invitations.";
  }

  return (
    <main className="min-h-screen bg-cream pb-24">
      <div className="bg-surface border-b border-muted/30 sticky top-14 z-40">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center gap-3">
          <Link
            href={`/app/events/${event.slug}`}
            className="inline-flex items-center gap-1 text-accent text-sm hover:underline"
          >
            <IconBack className="w-4 h-4" />
            Back
          </Link>
          <h1 className="flex-1 text-center text-light font-medium text-[15px] pr-16">
            Invitations
          </h1>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-4">
        <p className="text-sm text-muted mb-4">{event.title}</p>
        <InvitationsFeed
          event={event}
          initialItems={items}
          listError={listError}
        />
      </div>
    </main>
  );
}
