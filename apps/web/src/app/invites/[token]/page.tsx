import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  absolutePublicInviteOgImageUrl,
  absolutePublicInviteUrl,
  inviteOgDescription,
  inviteShareTitle,
} from "@/lib/invitations/invite-share";
import { inviteOgDimensions } from "@/lib/invitations/invite-og-image";
import PublicInviteView from "./PublicInviteView";
import { loadPublicInvitation } from "./load-public-invitation";

interface PageProps {
  params: Promise<{ token: string }>;
}

/** Guest tokens are unknown at build — metadata and page render at request time only. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const data = await loadPublicInvitation(token);
  if (!data) {
    return { title: "Invitation · CeremonyWallet" };
  }

  const url = absolutePublicInviteUrl(token);
  const title = inviteShareTitle(data);
  const description = inviteOgDescription(data);
  const ogTitle =
    data.invitation.content.headline?.trim() ||
    data.event.title.trim() ||
    title;
  const ogImage = absolutePublicInviteOgImageUrl(
    token,
    data.invitation.id
  );
  const ogAlt = ogTitle;
  const ogSize = inviteOgDimensions(data.invitation.templateId);

  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: "CeremonyWallet",
      type: "website",
      locale: "en_UG",
      images: [
        {
          url: ogImage,
          width: ogSize.width,
          height: ogSize.height,
          alt: ogAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [ogImage],
    },
  };
}

export default async function PublicInvitePage({ params }: PageProps) {
  const { token } = await params;
  const data = await loadPublicInvitation(token);
  if (!data) notFound();

  return <PublicInviteView viewToken={token} initial={data} />;
}
