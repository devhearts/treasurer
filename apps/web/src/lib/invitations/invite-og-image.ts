import "server-only";

import sharp from "sharp";
import { embedPhotoInSvg } from "./embed-photo-in-svg";
import { resolveInvitePhotoHref } from "./invite-photo";
import { renderInviteCardSvg } from "./render-invite-card";
import { getInviteTemplate } from "./template-registry";
import type { InviteCardContent, InviteTemplateId } from "./types";

const OG_SCALE = 2;

export function inviteOgDimensions(templateId: InviteTemplateId | string): {
  width: number;
  height: number;
} {
  const { width, height } = getInviteTemplate(templateId).format;
  return {
    width: width * OG_SCALE,
    height: height * OG_SCALE,
  };
}

export async function inviteCardToPngBuffer(
  templateId: InviteTemplateId | string,
  content: InviteCardContent,
  photoCtx?: {
    eventSlug: string;
    invitationId?: string;
    viewToken?: string;
    hasEventPhoto?: boolean;
  }
): Promise<Buffer> {
  const { width, height } = inviteOgDimensions(templateId);
  let svg = renderInviteCardSvg(templateId, content, {
    width,
    height,
    photo: photoCtx
      ? { ...photoCtx, absolute: true }
      : undefined,
  });

  if (photoCtx) {
    const href = resolveInvitePhotoHref(templateId, content, {
      ...photoCtx,
      absolute: true,
    });
    if (href) {
      svg = await embedPhotoInSvg(svg, href);
    }
  }

  return sharp(Buffer.from(svg)).png().toBuffer();
}
