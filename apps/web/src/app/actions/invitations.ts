"use server";

import { serverApiFetch, serverApiJson } from "@/lib/server-api";
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

export async function uploadInvitationPhoto(
  invitationId: string,
  formData: FormData
): Promise<
  | { success: true; key: string; photoUrl: string }
  | { success: false; error: string }
> {
  try {
    const res = await serverApiFetch(`invitations/${invitationId}/photo`, {
      method: "POST",
      body: formData,
    });
    const text = await res.text();
    const data = text ? (JSON.parse(text) as unknown) : null;
    if (!res.ok) {
      const msg =
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof (data as { message: unknown }).message === "string"
          ? (data as { message: string }).message
          : text || res.statusText;
      return { success: false, error: msg };
    }
    const key =
      typeof data === "object" &&
      data !== null &&
      "key" in data &&
      typeof (data as { key: unknown }).key === "string"
        ? (data as { key: string }).key
        : "";
    const photoUrl =
      typeof data === "object" &&
      data !== null &&
      "photoUrl" in data &&
      typeof (data as { photoUrl: unknown }).photoUrl === "string"
        ? (data as { photoUrl: string }).photoUrl
        : "";
    if (!key || !photoUrl) {
      return { success: false, error: "Invalid upload response." };
    }
    return { success: true, key, photoUrl };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Upload failed.",
    };
  }
}

export async function resetInvitationPhotoToEvent(
  invitationId: string
): Promise<
  | { success: true; content: InviteCardContent }
  | { success: false; error: string }
> {
  try {
    const detail = await serverApiJson<InvitationDetail>(
      `invitations/${invitationId}/photo/use-event`,
      { method: "POST", body: JSON.stringify({}) }
    );
    return { success: true, content: withNormalizedContent(detail).content };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Could not reset photo.",
    };
  }
}

export async function clearInvitationPhoto(
  invitationId: string
): Promise<
  | { success: true; content: InviteCardContent }
  | { success: false; error: string }
> {
  try {
    const detail = await serverApiJson<InvitationDetail>(
      `invitations/${invitationId}/photo`,
      { method: "DELETE" }
    );
    return { success: true, content: withNormalizedContent(detail).content };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Could not remove photo.",
    };
  }
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
