import type { PublicInvitePayload } from "./types";
import { siteBaseUrl } from "@/lib/event-share";

export function publicInvitePath(viewToken: string): string {
  return `/invites/${encodeURIComponent(viewToken)}`;
}

export function absolutePublicInviteUrl(viewToken: string): string {
  return `${siteBaseUrl()}${publicInvitePath(viewToken)}`;
}

/** Absolute OG image URL (crawlers need a full URL). Served at request time — no build-time API. */
export function absolutePublicInviteOgImageUrl(
  viewToken: string,
  invitationId?: string
): string {
  const base = `${siteBaseUrl()}/api/invites/${encodeURIComponent(viewToken)}/og`;
  if (!invitationId) return base;
  return `${base}?v=${encodeURIComponent(invitationId)}`;
}

export function inviteShareTitle(payload: PublicInvitePayload): string {
  const headline =
    payload.invitation.content.headline?.trim() ||
    payload.event.title.trim() ||
    "Invitation";
  const suffix = " · CeremonyWallet";
  const max = 72 - suffix.length;
  const head =
    headline.length <= max ? headline : `${headline.slice(0, Math.max(1, max - 1))}…`;
  return `${head}${suffix}`;
}

export function inviteOgDescription(
  payload: PublicInvitePayload,
  maxLen = 200
): string {
  const c = payload.invitation.content;
  const parts: string[] = [];
  if (payload.guestName.trim()) {
    parts.push(`Invitation for ${payload.guestName.trim()}`);
  }
  const names = [c.name1, c.name2].filter((n) => n?.trim()).join(" & ");
  if (names) parts.push(names);
  const when = [c.date, c.time].filter(Boolean).join(" · ");
  if (when) parts.push(when);
  const where = [c.venue, c.location].filter(Boolean).join(", ");
  if (where) parts.push(where);
  let s = parts.join(" · ") || payload.event.title.trim() || "You're invited";
  if (c.footer?.trim()) s += `. ${c.footer.trim()}`;
  return s.length <= maxLen ? s : `${s.slice(0, Math.max(1, maxLen - 1))}…`;
}

/** Message body when sharing a personalized guest link (SMS, WhatsApp, etc.). */
export function guestInviteShareBlurb(
  guestName: string,
  invitationTitle: string,
  url: string
): string {
  const name = guestName.trim();
  const invite = invitationTitle.trim() || "your invitation";
  const greeting = name ? `Hi ${name},\n\n` : "";
  return `${greeting}You're invited — ${invite}:\n${url}`;
}
