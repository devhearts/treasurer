import { inviteCardToPngBuffer } from "@/lib/invitations/invite-og-image";
import { loadPublicInvitation } from "@/app/invites/[token]/load-public-invitation";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const data = await loadPublicInvitation(token);
  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const png = await inviteCardToPngBuffer(
    data.invitation.templateId,
    data.invitation.content,
    {
      eventSlug: data.event.slug,
      invitationId: data.invitation.id,
      viewToken: token,
      hasEventPhoto: Boolean(
        data.invitation.content.photoUrl?.includes("/gallery/") ||
          data.invitation.content.photoKey
      ),
    }
  );

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
