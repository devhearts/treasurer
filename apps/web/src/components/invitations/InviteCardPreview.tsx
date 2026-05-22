"use client";

import type { InviteCardContent, InviteTemplateId } from "@/lib/invitations/types";
import { renderInviteCardSvg } from "@/lib/invitations/render-invite-card";

interface InviteCardPreviewProps {
  templateId: InviteTemplateId;
  content: InviteCardContent;
  className?: string;
  /** Max width in px; card scales to 100% of container up to this cap. */
  maxWidth?: number;
}

export default function InviteCardPreview({
  templateId,
  content,
  className = "",
  maxWidth,
}: InviteCardPreviewProps) {
  const svg = renderInviteCardSvg(templateId, content, { responsive: true });

  return (
    <div
      className={`w-full mx-auto ${className}`}
      style={{
        ...(maxWidth !== undefined ? { maxWidth } : {}),
        filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.12))",
      }}
    >
      <div
        className="w-full aspect-[5/7] [&_svg]:block [&_svg]:w-full [&_svg]:h-full"
        dangerouslySetInnerHTML={{ __html: svg }}
        aria-label="Invitation card preview"
      />
    </div>
  );
}
