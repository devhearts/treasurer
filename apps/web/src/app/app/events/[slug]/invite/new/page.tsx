import { notFound, redirect } from "next/navigation";
import { getEventBySlug } from "@/app/actions/events";
import { getCurrentUser } from "@/lib/auth-server";
import { createInvitation } from "@/app/actions/invitations";
import InvitationWizard from "../InvitationWizard";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function NewInvitationPage({ params }: PageProps) {
  const { slug } = await params;
  const [event, user] = await Promise.all([
    getEventBySlug(slug),
    getCurrentUser(),
  ]);

  if (!event) notFound();
  if (!user) redirect("/");
  if (event.userId && user.id !== event.userId) notFound();

  const inv = await createInvitation(slug);
  return <InvitationWizard event={event} initial={inv} />;
}
