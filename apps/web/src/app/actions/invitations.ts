"use server";

import { serverApiJson } from "@/lib/server-api";
import type {
  InvitationDetail,
  InvitationListItem,
  InvitationRecipient,
  InviteCardContent,
  InviteTemplateId,
  PublicInvitePayload,
} from "@/lib/invitations/types";
import { normalizeInviteCardContent } from "@/lib/invitations/parse-invite-content";

function withNormalizedContent(detail: InvitationDetail): InvitationDetail {
  return {
    ...detail,
    content: normalizeInviteCardContent(detail.content),
  };
}

function withNormalizedPublic(payload: PublicInvitePayload): PublicInvitePayload {
  return {
    ...payload,
    invitation: {
      ...payload.invitation,
      content: normalizeInviteCardContent(payload.invitation.content),
    },
  };
}

export async function listInvitations(
  eventSlug: string
): Promise<InvitationListItem[]> {
  return serverApiJson<InvitationListItem[]>(
    `events/by-slug/${encodeURIComponent(eventSlug)}/invitations`
  );
}

export async function createInvitation(
  eventSlug: string
): Promise<InvitationDetail> {
  const detail = await serverApiJson<InvitationDetail>(
    `events/by-slug/${encodeURIComponent(eventSlug)}/invitations`,
    { method: "POST", body: JSON.stringify({}) }
  );
  return withNormalizedContent(detail);
}

export async function getInvitation(id: string): Promise<InvitationDetail> {
  const detail = await serverApiJson<InvitationDetail>(`invitations/${id}`);
  return withNormalizedContent(detail);
}

export async function updateInvitation(
  id: string,
  body: {
    title?: string;
    templateId?: InviteTemplateId;
    content?: Partial<InviteCardContent>;
  }
): Promise<InvitationDetail> {
  const detail = await serverApiJson<InvitationDetail>(`invitations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return withNormalizedContent(detail);
}

export async function addInvitationRecipient(
  invitationId: string,
  body: { guestName: string; contact?: string }
): Promise<InvitationRecipient> {
  return serverApiJson<InvitationRecipient>(
    `invitations/${invitationId}/recipients`,
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function removeInvitationRecipient(
  invitationId: string,
  recipientId: string
): Promise<void> {
  await serverApiJson(`invitations/${invitationId}/recipients/${recipientId}`, {
    method: "DELETE",
  });
}

export async function publishInvitation(id: string): Promise<InvitationDetail> {
  const detail = await serverApiJson<InvitationDetail>(`invitations/${id}/publish`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return withNormalizedContent(detail);
}

export async function duplicateInvitation(id: string): Promise<InvitationDetail> {
  const detail = await serverApiJson<InvitationDetail>(`invitations/${id}/duplicate`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return withNormalizedContent(detail);
}

export async function deleteInvitation(id: string): Promise<void> {
  await serverApiJson(`invitations/${id}`, { method: "DELETE" });
}

export async function getPublicInvitation(
  viewToken: string
): Promise<PublicInvitePayload> {
  const payload = await serverApiJson<PublicInvitePayload>(
    `public/invites/${encodeURIComponent(viewToken)}`
  );
  return withNormalizedPublic(payload);
}

export async function submitInvitationRsvp(
  viewToken: string,
  body: {
    status: "accepted" | "declined" | "maybe";
    message?: string;
  }
): Promise<PublicInvitePayload> {
  const payload = await serverApiJson<PublicInvitePayload>(
    `public/invites/${encodeURIComponent(viewToken)}/rsvp`,
    { method: "POST", body: JSON.stringify(body) }
  );
  return withNormalizedPublic(payload);
}
