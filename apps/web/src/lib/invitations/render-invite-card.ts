import type { InviteCardContent, InviteTemplateId } from "./types";
import {
  renderTemplateSvg,
  type RenderTemplatePhotoOpts,
} from "./template-registry";

export type { RenderTemplatePhotoOpts };

export function renderInviteCardSvg(
  templateId: InviteTemplateId | string,
  content: InviteCardContent,
  opts?: {
    width?: number;
    height?: number;
    responsive?: boolean;
    photo?: RenderTemplatePhotoOpts;
  }
): string {
  return renderTemplateSvg(templateId, content, opts);
}
