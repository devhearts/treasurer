import "server-only";

import sharp from "sharp";
import { renderInviteCardSvg } from "./render-invite-card";
import type { InviteCardContent, InviteTemplateId } from "./types";

/** Portrait 5:7 — full card visible in link previews (not cropped to 1.91:1). */
export const INVITE_OG_WIDTH = 800;
export const INVITE_OG_HEIGHT = 1120;

export async function inviteCardToPngBuffer(
  templateId: InviteTemplateId,
  content: InviteCardContent
): Promise<Buffer> {
  const svg = renderInviteCardSvg(templateId, content, {
    width: INVITE_OG_WIDTH,
    height: INVITE_OG_HEIGHT,
  });
  return sharp(Buffer.from(svg)).png().toBuffer();
}
