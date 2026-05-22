import "server-only";

import { ServerApiError, serverApiJsonInternal } from "@/lib/server-api";
import { normalizeInviteCardContent } from "@/lib/invitations/parse-invite-content";
import type { PublicInvitePayload } from "@/lib/invitations/types";

/**
 * Loads a guest invite for `/invites/[token]` (page, metadata, OG image).
 * Uses internal API fetch (no session) — same as public guest links.
 */
export async function loadPublicInvitation(
  viewToken: string
): Promise<PublicInvitePayload | null> {
  try {
    const payload = await serverApiJsonInternal<PublicInvitePayload>(
      `public/invites/${encodeURIComponent(viewToken)}`
    );
    return {
      ...payload,
      invitation: {
        ...payload.invitation,
        content: normalizeInviteCardContent(payload.invitation.content),
      },
    };
  } catch (e) {
    if (e instanceof ServerApiError && e.status === 404) return null;
    throw e;
  }
}
