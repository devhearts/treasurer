import { notFound, redirect } from "next/navigation";
import { getEventBySlug } from "@/app/actions/events";
import { getCurrentUser } from "@/lib/auth-server";
import { getInvitation } from "@/app/actions/invitations";
import InvitationWizard from "../InvitationWizard";

interface PageProps {
  params: Promise<{ slug: string; invitationId: string }>;
}

export default async function EditInvitationPage({ params }: PageProps) {
  const { slug, invitationId } = await params;
  const [event, user] = await Promise.all([
    getEventBySlug(slug),
    getCurrentUser(),
  ]);

  if (!event) notFound();
  if (!user) redirect("/");
  if (event.userId && user.id !== event.userId) notFound();

  let inv;
  try {
    inv = await getInvitation(invitationId);
  } catch {
    notFound();
  }
  if (inv.eventId !== event.id) notFound();

  return <InvitationWizard event={event} initial={inv} />;
}
