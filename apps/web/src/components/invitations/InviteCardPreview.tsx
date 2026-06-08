"use client";

import type { InviteCardContent, InviteTemplateId } from "@/lib/invitations/types";
import { renderInviteCardSvg } from "@/lib/invitations/render-invite-card";
import { getInviteTemplate } from "@/lib/invitations/template-registry";

interface InviteCardPreviewProps {
  templateId: InviteTemplateId | string;
  content: InviteCardContent;
  className?: string;
  /** Max width in px; card scales to 100% of container up to this cap. */
  maxWidth?: number;
  eventSlug?: string;
  invitationId?: string;
  viewToken?: string;
  hasEventPhoto?: boolean;
}

const ASPECT_CLASS: Record<string, string> = {
  "5/7": "aspect-[5/7]",
  "1/1": "aspect-square",
  "3/4": "aspect-[3/4]",
  "16/9": "aspect-video",
};

export default function InviteCardPreview({
  templateId,
  content,
  className = "",
  maxWidth,
  eventSlug,
  invitationId,
  viewToken,
  hasEventPhoto,
}: InviteCardPreviewProps) {
  const def = getInviteTemplate(templateId);
  const aspect =
    ASPECT_CLASS[def.format.aspectClass] ?? "aspect-[5/7]";
  const svg = renderInviteCardSvg(templateId, content, {
    responsive: true,
    photo:
      eventSlug && def.supportsPhoto
        ? { eventSlug, invitationId, viewToken, hasEventPhoto }
        : undefined,
  });

  return (
    <div
      className={`w-full mx-auto ${className}`}
      style={{
        ...(maxWidth !== undefined ? { maxWidth } : {}),
        filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.12))",
      }}
    >
      <div
        className={`w-full ${aspect} [&_svg]:block [&_svg]:w-full [&_svg]:h-full`}
        dangerouslySetInnerHTML={{ __html: svg }}
        aria-label="Invitation card preview"
      />
    </div>
  );
}
