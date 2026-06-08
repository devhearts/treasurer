export type InviteTemplateId =
  | "royal"
  | "botanical"
  | "pop"
  | "minimal"
  | "pastel"
  | "cyber"
  | "memorial"
  | "heritage"
  | "celebrate"
  | "savedate"
  | "gala";

export const INVITE_TEMPLATE_IDS: InviteTemplateId[] = [
  "royal",
  "botanical",
  "pop",
  "minimal",
  "pastel",
  "cyber",
  "memorial",
  "heritage",
  "celebrate",
  "savedate",
  "gala",
];

export function isInviteTemplateId(id: string): id is InviteTemplateId {
  return (INVITE_TEMPLATE_IDS as string[]).includes(id);
}

export type InvitationStatus = "draft" | "published";

export type RsvpStatus = "pending" | "accepted" | "declined" | "maybe";

export interface InviteCardContent {
  name1: string;
  name2: string;
  headline: string;
  subtitle?: string;
  tagline?: string;
  hostLine?: string;
  honoree?: string;
  familyLine?: string;
  date: string;
  time: string;
  venue: string;
  location: string;
  dressCode?: string;
  ceremonyNote?: string;
  receptionNote?: string;
  footer: string;
  photoUrl?: string;
  photoKey?: string;
  font: "serif" | "sans-serif" | "script" | "monospace";
  accentColor: string;
  customMessage?: string;
  rsvpEnabled: boolean;
  rsvpDeadline?: string;
  rsvpNote?: string;
  extra?: Record<string, string>;
}

/** Satisfies Drizzle `json().$type<Record<string, unknown>>()` on insert/update. */
export function inviteContentToJson(
  content: InviteCardContent
): Record<string, unknown> {
  return content as unknown as Record<string, unknown>;
}

export interface InvitationListItemDto {
  id: string;
  eventId: string;
  title: string;
  templateId: InviteTemplateId;
  status: InvitationStatus;
  publishedAt: string | null;
  recipientCount: number;
  openCount: number;
  rsvpYesCount: number;
  rsvpNoCount: number;
  rsvpMaybeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvitationRecipientDto {
  id: string;
  guestName: string;
  contact: string | null;
  viewToken: string;
  openedAt: string | null;
  rsvpStatus: RsvpStatus;
  rsvpAt: string | null;
  rsvpPartySize: number | null;
  rsvpMessage: string | null;
  publicUrl: string;
}

export interface InvitationDetailDto extends InvitationListItemDto {
  content: InviteCardContent;
  recipients: InvitationRecipientDto[];
}

export interface PublicInviteDto {
  guestName: string;
  invitation: {
    id: string;
    title: string;
    templateId: InviteTemplateId;
    content: InviteCardContent;
    status: InvitationStatus;
  };
  event: {
    slug: string;
    title: string;
    type: string;
    date: string;
    location: string;
    organizer: string;
  };
  rsvp: {
    status: RsvpStatus;
    at: string | null;
    partySize: number | null;
    message: string | null;
    deadlinePassed: boolean;
  };
}
