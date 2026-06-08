import { publicEventGallerySlotPath, siteBaseUrl } from "@/lib/event-share";
import type { InviteCardContent } from "./types";
import { getInviteTemplate } from "./template-registry";

export function invitationPhotoPath(invitationId: string): string {
  return `/api/v1/invitations/${encodeURIComponent(invitationId)}/photo`;
}

export function publicInvitePhotoPath(viewToken: string): string {
  return `/api/v1/public/invites/${encodeURIComponent(viewToken)}/photo`;
}

export function defaultEventPhotoPath(eventSlug: string): string {
  return publicEventGallerySlotPath(eventSlug, 0);
}

export function eventHasGalleryPhoto(
  imageUrls: string[] | null | undefined
): boolean {
  return Boolean(imageUrls?.length);
}

/** Same-origin or absolute URL for SVG &lt;image href&gt;. */
export function resolveInvitePhotoHref(
  templateId: string,
  content: InviteCardContent,
  opts: {
    eventSlug: string;
    invitationId?: string;
    viewToken?: string;
    hasEventPhoto?: boolean;
    absolute?: boolean;
  }
): string | undefined {
  const def = getInviteTemplate(templateId);
  if (!def.supportsPhoto) return undefined;

  const base = opts.absolute ? siteBaseUrl() : "";
  const prefix = (path: string) =>
    path.startsWith("http") ? path : `${base}${path}`;

  const explicit = content.photoUrl?.trim();
  if (explicit === "none") return undefined;

  if (content.photoKey?.trim() && opts.invitationId) {
    return prefix(invitationPhotoPath(opts.invitationId));
  }

  if (content.photoKey?.trim() && opts.viewToken) {
    return prefix(publicInvitePhotoPath(opts.viewToken));
  }

  if (explicit) {
    return prefix(explicit);
  }

  if (opts.hasEventPhoto) {
    return prefix(defaultEventPhotoPath(opts.eventSlug));
  }

  return undefined;
}

export function defaultPhotoUrlForEvent(eventSlug: string): string {
  return defaultEventPhotoPath(eventSlug);
}
