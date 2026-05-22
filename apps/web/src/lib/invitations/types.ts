export type InviteTemplateId =
  | "royal"
  | "botanical"
  | "pop"
  | "minimal"
  | "pastel"
  | "cyber";

export type InvitationStatus = "draft" | "published";
export type RsvpStatus = "pending" | "accepted" | "declined" | "maybe";

export interface InviteCardContent {
  name1: string;
  name2: string;
  headline: string;
  date: string;
  time: string;
  venue: string;
  location: string;
  footer: string;
  font: "serif" | "sans-serif" | "script" | "monospace";
  accentColor: string;
  customMessage?: string;
  rsvpEnabled: boolean;
  rsvpDeadline?: string;
  rsvpNote?: string;
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
