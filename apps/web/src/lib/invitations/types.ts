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

export type InvitationStatus = "draft" | "published";
export type RsvpStatus = "pending" | "accepted" | "declined" | "maybe";

/** Card-facing text keys (rendered on SVG). RSVP keys are separate. */
export type InviteCardFieldKey =
  | "name1"
  | "name2"
  | "headline"
  | "subtitle"
  | "tagline"
  | "hostLine"
  | "honoree"
  | "familyLine"
  | "date"
  | "time"
  | "venue"
  | "location"
  | "dressCode"
  | "ceremonyNote"
  | "receptionNote"
  | "footer";

export const CORE_CARD_FIELD_KEYS: InviteCardFieldKey[] = [
  "name1",
  "name2",
  "headline",
  "date",
  "time",
  "venue",
  "location",
  "footer",
];

export const OPTIONAL_CARD_FIELD_KEYS: InviteCardFieldKey[] = [
  "subtitle",
  "tagline",
  "hostLine",
  "honoree",
  "familyLine",
  "dressCode",
  "ceremonyNote",
  "receptionNote",
];

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
  /** Same-origin path or absolute URL; `none` hides photo. */
  photoUrl?: string;
  /** Garage key `invitations/{id}/photo.ext` when using a custom upload. */
  photoKey?: string;
  font: "serif" | "sans-serif" | "script" | "monospace";
  accentColor: string;
  customMessage?: string;
  rsvpEnabled: boolean;
  rsvpDeadline?: string;
  rsvpNote?: string;
  /** Unknown keys from future templates / manual JSON edits. */
  extra?: Record<string, string>;
}

export function getCardField(
  content: InviteCardContent,
  key: InviteCardFieldKey
): string {
  const v = content[key];
  if (typeof v === "string") return v;
  return content.extra?.[key] ?? "";
}

export interface InvitationListItem {
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

export interface InvitationRecipient {
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

export interface InvitationDetail extends InvitationListItem {
  content: InviteCardContent;
  recipients: InvitationRecipient[];
}

export interface PublicInvitePayload {
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
