import type { InviteTemplateId } from "./types";
import {
  getInviteTemplateMeta,
  INVITE_TEMPLATES,
  type InviteTemplateMeta,
} from "./template-registry";

export type { InviteTemplateMeta };

export { INVITE_TEMPLATES };

export function getTemplateMeta(id: InviteTemplateId | string): InviteTemplateMeta {
  return getInviteTemplateMeta(id);
}
