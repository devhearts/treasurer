import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes, randomUUID } from "crypto";
import type { Readable } from "stream";
import type { DrizzleDb } from "../database/database.module";
import { DRIZZLE } from "../database/database.module";
import * as schema from "../database/schema";
import { formatMysqlDateTimeUtc } from "../common/mysql-datetime";
import { EventsService } from "../events/events.service";
import { StorageService } from "../integrations/storage.service";
import {
  inviteContentToJson,
  type InviteCardContent,
  type InvitationDetailDto,
  type InvitationListItemDto,
  type InvitationRecipientDto,
  isInviteTemplateId,
  type InviteTemplateId,
  type PublicInviteDto,
  type RsvpStatus,
} from "./invitations.types";

import {
  defaultContentFromEvent,
  defaultTemplateForEvent,
  eventGalleryPhotoUrl,
  eventHasStoredImages,
} from "./invite-content-defaults";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/audit-actions";

const INVITATION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invitationPhotoKey(invitationId: string, ext: string): string {
  return `invitations/${invitationId}/photo.${ext}`;
}

function isInvitationPhotoKey(key: string, invitationId: string): boolean {
  if (!INVITATION_ID_RE.test(invitationId)) return false;
  return /^invitations\/[0-9a-f-]{36}\/photo\.(jpg|jpeg|png|webp)$/i.test(
    key
  ) && key.startsWith(`invitations/${invitationId}/`);
}

/** mysql2 often returns JSON columns as a string; Drizzle passes that through unchanged. */
function coerceContentJson(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  let parsed: unknown = raw;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return {};
    }
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  return {};
}

const CARD_STRING_KEYS = [
  "name1",
  "name2",
  "headline",
  "subtitle",
  "tagline",
  "hostLine",
  "honoree",
  "familyLine",
  "date",
  "time",
  "venue",
  "location",
  "dressCode",
  "ceremonyNote",
  "receptionNote",
  "footer",
] as const;

const META_KEYS = new Set([
  "font",
  "accentColor",
  "customMessage",
  "photoUrl",
  "photoKey",
  "rsvpEnabled",
  "rsvpDeadline",
  "rsvpNote",
  "extra",
]);

function optionalStr(
  o: Record<string, unknown>,
  key: string
): string | undefined {
  const v = o[key];
  if (v == null || String(v).trim() === "") return undefined;
  return String(v);
}

function parseContent(raw: unknown): InviteCardContent {
  const o = coerceContentJson(raw);
  const extra: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (
      META_KEYS.has(k) ||
      (CARD_STRING_KEYS as readonly string[]).includes(k)
    ) {
      continue;
    }
    if (typeof v === "string" && v.trim()) extra[k] = v;
  }

  return {
    name1: String(o.name1 ?? ""),
    name2: String(o.name2 ?? ""),
    headline: String(o.headline ?? "Celebration"),
    subtitle: optionalStr(o, "subtitle"),
    tagline: optionalStr(o, "tagline"),
    hostLine: optionalStr(o, "hostLine"),
    honoree: optionalStr(o, "honoree"),
    familyLine: optionalStr(o, "familyLine"),
    date: String(o.date ?? ""),
    time: String(o.time ?? ""),
    venue: String(o.venue ?? ""),
    location: String(o.location ?? ""),
    dressCode: optionalStr(o, "dressCode"),
    ceremonyNote: optionalStr(o, "ceremonyNote"),
    receptionNote: optionalStr(o, "receptionNote"),
    footer: String(o.footer ?? ""),
    font: (["serif", "sans-serif", "script", "monospace"].includes(
      String(o.font)
    )
      ? o.font
      : "serif") as InviteCardContent["font"],
    accentColor: String(o.accentColor ?? "#9A7432"),
    photoUrl: optionalStr(o, "photoUrl"),
    photoKey: optionalStr(o, "photoKey"),
    customMessage: optionalStr(o, "customMessage"),
    rsvpEnabled: o.rsvpEnabled !== false,
    rsvpDeadline: optionalStr(o, "rsvpDeadline"),
    rsvpNote: optionalStr(o, "rsvpNote"),
    extra: Object.keys(extra).length > 0 ? extra : undefined,
  };
}

function viewToken(): string {
  return randomBytes(24).toString("base64url");
}

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    private readonly events: EventsService,
    private readonly audit: AuditService
  ) {}

  private appBaseUrl(): string {
    const fromEnv =
      this.config.get<string>("app.nextPublicAppUrl")?.trim() ||
      this.config.get<string>("app.webOrigin")?.trim();
    return (fromEnv || "http://localhost:3000").replace(/\/+$/, "");
  }

  private publicUrl(token: string): string {
    return `${this.appBaseUrl()}/invites/${token}`;
  }

  private async getOwnedEvent(userId: string, slug: string) {
    const rows = await this.db
      .select()
      .from(schema.events)
      .where(eq(schema.events.slug, slug))
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException("Event not found.");
    if (!row.userId || row.userId !== userId) {
      throw new ForbiddenException("Not allowed.");
    }
    return row;
  }

  private async getOwnedInvitation(userId: string, invitationId: string) {
    const rows = await this.db
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.id, invitationId))
      .limit(1);
    const inv = rows[0];
    if (!inv) throw new NotFoundException("Invitation not found.");
    if (inv.userId !== userId) throw new ForbiddenException("Not allowed.");
    return inv;
  }

  private mapListItem(row: typeof schema.invitations.$inferSelect): InvitationListItemDto {
    return {
      id: row.id,
      eventId: row.eventId,
      title: row.title,
      templateId: row.templateId as InviteTemplateId,
      status: row.status as "draft" | "published",
      publishedAt: row.publishedAt ?? null,
      recipientCount: row.recipientCount,
      openCount: row.openCount,
      rsvpYesCount: row.rsvpYesCount,
      rsvpNoCount: row.rsvpNoCount,
      rsvpMaybeCount: row.rsvpMaybeCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async recipientsFor(
    invitationId: string
  ): Promise<InvitationRecipientDto[]> {
    const rows = await this.db
      .select()
      .from(schema.invitationRecipients)
      .where(eq(schema.invitationRecipients.invitationId, invitationId))
      .orderBy(desc(schema.invitationRecipients.createdAt));
    return rows.map((r) => ({
      id: r.id,
      guestName: r.guestName,
      contact: r.contact,
      viewToken: r.viewToken,
      openedAt: r.openedAt ?? null,
      rsvpStatus: r.rsvpStatus as RsvpStatus,
      rsvpAt: r.rsvpAt ?? null,
      rsvpPartySize: r.rsvpPartySize,
      rsvpMessage: r.rsvpMessage,
      publicUrl: this.publicUrl(r.viewToken),
    }));
  }

  async listByEventSlug(
    userId: string,
    slug: string
  ): Promise<InvitationListItemDto[]> {
    const event = await this.getOwnedEvent(userId, slug);
    const rows = await this.db
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.eventId, event.id))
      .orderBy(desc(schema.invitations.updatedAt));
    return rows.map((r) => this.mapListItem(r));
  }

  async createDraft(userId: string, slug: string): Promise<InvitationDetailDto> {
    const event = await this.getOwnedEvent(userId, slug);
    const templateId = defaultTemplateForEvent(event.type);
    const content = defaultContentFromEvent(event, templateId);
    const now = formatMysqlDateTimeUtc(new Date());
    const id = randomUUID();
    const title =
      content.name2.trim()
        ? `${content.name1} & ${content.name2}`
        : content.name1 || event.title;

    await this.db.insert(schema.invitations).values({
      id,
      eventId: event.id,
      userId,
      title,
      templateId,
      contentJson: inviteContentToJson(content),
      status: "draft",
      publishedAt: null,
      recipientCount: 0,
      openCount: 0,
      rsvpYesCount: 0,
      rsvpNoCount: 0,
      rsvpMaybeCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    this.audit.logUserAction(
      userId,
      AuditAction.invitation.draftCreated,
      { type: "invitation", id },
      { invitationId: id, eventSlug: slug }
    );

    return this.getDetail(userId, id);
  }

  async getDetail(userId: string, invitationId: string): Promise<InvitationDetailDto> {
    const inv = await this.getOwnedInvitation(userId, invitationId);
    const recipients = await this.recipientsFor(inv.id);
    return {
      ...this.mapListItem(inv),
      content: parseContent(inv.contentJson),
      recipients,
    };
  }

  async update(
    userId: string,
    invitationId: string,
    body: {
      title?: string;
      templateId?: InviteTemplateId;
      content?: Partial<InviteCardContent>;
    }
  ): Promise<InvitationDetailDto> {
    const inv = await this.getOwnedInvitation(userId, invitationId);
    if (body.templateId != null && !isInviteTemplateId(body.templateId)) {
      throw new BadRequestException("Invalid invitation theme.");
    }
    const content = parseContent(inv.contentJson);
    const merged: InviteCardContent = {
      ...content,
      ...(body.content ?? {}),
    };
    const now = formatMysqlDateTimeUtc(new Date());
    await this.db
      .update(schema.invitations)
      .set({
        title: body.title?.trim() || inv.title,
        templateId: body.templateId ?? inv.templateId,
        contentJson: inviteContentToJson(merged),
        updatedAt: now,
      })
      .where(eq(schema.invitations.id, invitationId));
    this.audit.logUserAction(
      userId,
      AuditAction.invitation.updated,
      { type: "invitation", id: invitationId },
      { invitationId }
    );
    return this.getDetail(userId, invitationId);
  }

  async addRecipient(
    userId: string,
    invitationId: string,
    body: { guestName: string; contact?: string }
  ): Promise<InvitationRecipientDto> {
    await this.getOwnedInvitation(userId, invitationId);
    const name = body.guestName?.trim();
    if (!name) throw new BadRequestException("Guest name is required.");
    const id = randomUUID();
    const token = viewToken();
    const now = formatMysqlDateTimeUtc(new Date());
    await this.db.insert(schema.invitationRecipients).values({
      id,
      invitationId,
      guestName: name,
      contact: body.contact?.trim() || null,
      viewToken: token,
      openedAt: null,
      rsvpStatus: "pending",
      rsvpAt: null,
      rsvpPartySize: null,
      rsvpMessage: null,
      createdAt: now,
    });
    await this.refreshRecipientCount(invitationId);
    const rows = await this.db
      .select()
      .from(schema.invitationRecipients)
      .where(eq(schema.invitationRecipients.id, id))
      .limit(1);
    const r = rows[0]!;
    this.audit.logUserAction(
      userId,
      AuditAction.invitation.recipientAdded,
      { type: "invitation_recipient", id },
      { invitationId, recipientId: id }
    );
    return {
      id: r.id,
      guestName: r.guestName,
      contact: r.contact,
      viewToken: r.viewToken,
      openedAt: null,
      rsvpStatus: "pending",
      rsvpAt: null,
      rsvpPartySize: null,
      rsvpMessage: null,
      publicUrl: this.publicUrl(r.viewToken),
    };
  }

  async removeRecipient(
    userId: string,
    invitationId: string,
    recipientId: string
  ): Promise<void> {
    await this.getOwnedInvitation(userId, invitationId);
    await this.db
      .delete(schema.invitationRecipients)
      .where(
        and(
          eq(schema.invitationRecipients.id, recipientId),
          eq(schema.invitationRecipients.invitationId, invitationId)
        )
      );
    await this.refreshRecipientCount(invitationId);
    await this.refreshStats(invitationId);
    this.audit.logUserAction(
      userId,
      AuditAction.invitation.recipientRemoved,
      { type: "invitation_recipient", id: recipientId },
      { invitationId, recipientId }
    );
  }

  private async refreshRecipientCount(invitationId: string) {
    const rows = await this.db
      .select({ id: schema.invitationRecipients.id })
      .from(schema.invitationRecipients)
      .where(eq(schema.invitationRecipients.invitationId, invitationId));
    const now = formatMysqlDateTimeUtc(new Date());
    await this.db
      .update(schema.invitations)
      .set({ recipientCount: rows.length, updatedAt: now })
      .where(eq(schema.invitations.id, invitationId));
  }

  private async refreshStats(invitationId: string) {
    const rows = await this.db
      .select()
      .from(schema.invitationRecipients)
      .where(eq(schema.invitationRecipients.invitationId, invitationId));
    let openCount = 0;
    let rsvpYes = 0;
    let rsvpNo = 0;
    let rsvpMaybe = 0;
    for (const r of rows) {
      if (r.openedAt) openCount++;
      if (r.rsvpStatus === "accepted") rsvpYes++;
      else if (r.rsvpStatus === "declined") rsvpNo++;
      else if (r.rsvpStatus === "maybe") rsvpMaybe++;
    }
    const now = formatMysqlDateTimeUtc(new Date());
    await this.db
      .update(schema.invitations)
      .set({
        openCount,
        rsvpYesCount: rsvpYes,
        rsvpNoCount: rsvpNo,
        rsvpMaybeCount: rsvpMaybe,
        updatedAt: now,
      })
      .where(eq(schema.invitations.id, invitationId));
  }

  async publish(userId: string, invitationId: string): Promise<InvitationDetailDto> {
    const inv = await this.getOwnedInvitation(userId, invitationId);
    const recipients = await this.recipientsFor(inv.id);
    if (recipients.length === 0) {
      throw new BadRequestException("Add at least one guest before publishing.");
    }
    const now = formatMysqlDateTimeUtc(new Date());
    await this.db
      .update(schema.invitations)
      .set({
        status: "published",
        publishedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.invitations.id, invitationId));
    this.audit.logUserAction(
      userId,
      AuditAction.invitation.published,
      { type: "invitation", id: invitationId },
      { invitationId, recipientCount: recipients.length }
    );
    return this.getDetail(userId, invitationId);
  }

  async duplicate(userId: string, invitationId: string): Promise<InvitationDetailDto> {
    const inv = await this.getOwnedInvitation(userId, invitationId);
    const content = parseContent(inv.contentJson);
    delete content.photoKey;
    const slug = await this.eventSlugForId(inv.eventId);
    const eventRows = slug
      ? await this.db
          .select({ imageUrls: schema.events.imageUrls })
          .from(schema.events)
          .where(eq(schema.events.id, inv.eventId))
          .limit(1)
      : [];
    if (slug && eventHasStoredImages(eventRows[0]?.imageUrls)) {
      content.photoUrl = eventGalleryPhotoUrl(slug);
    } else {
      delete content.photoUrl;
    }
    const now = formatMysqlDateTimeUtc(new Date());
    const newId = randomUUID();
    await this.db.insert(schema.invitations).values({
      id: newId,
      eventId: inv.eventId,
      userId,
      title: `${inv.title} (copy)`,
      templateId: inv.templateId,
      contentJson: inviteContentToJson(content),
      status: "draft",
      publishedAt: null,
      recipientCount: 0,
      openCount: 0,
      rsvpYesCount: 0,
      rsvpNoCount: 0,
      rsvpMaybeCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    const oldRecipients = await this.recipientsFor(invitationId);
    for (const r of oldRecipients) {
      await this.addRecipient(userId, newId, {
        guestName: r.guestName,
        contact: r.contact ?? undefined,
      });
    }
    return this.getDetail(userId, newId);
  }

  async delete(userId: string, invitationId: string): Promise<void> {
    await this.getOwnedInvitation(userId, invitationId);
    await this.db
      .delete(schema.invitationRecipients)
      .where(eq(schema.invitationRecipients.invitationId, invitationId));
    await this.db
      .delete(schema.invitations)
      .where(eq(schema.invitations.id, invitationId));
    this.audit.logUserAction(
      userId,
      AuditAction.invitation.deleted,
      { type: "invitation", id: invitationId },
      { invitationId }
    );
  }

  private deadlinePassed(content: InviteCardContent): boolean {
    if (!content.rsvpDeadline?.trim()) return false;
    const d = new Date(content.rsvpDeadline);
    if (Number.isNaN(d.getTime())) return false;
    return d.getTime() < Date.now();
  }

  async getPublic(viewToken: string): Promise<PublicInviteDto> {
    const recRows = await this.db
      .select()
      .from(schema.invitationRecipients)
      .where(eq(schema.invitationRecipients.viewToken, viewToken))
      .limit(1);
    const rec = recRows[0];
    if (!rec) throw new NotFoundException("Invitation not found.");

    const invRows = await this.db
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.id, rec.invitationId))
      .limit(1);
    const inv = invRows[0];
    if (!inv || inv.status !== "published") {
      throw new NotFoundException("Invitation not found.");
    }

    const eventRows = await this.db
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, inv.eventId))
      .limit(1);
    const event = eventRows[0];
    if (!event) throw new NotFoundException("Event not found.");

    const content = parseContent(inv.contentJson);

    if (!rec.openedAt) {
      const now = formatMysqlDateTimeUtc(new Date());
      await this.db
        .update(schema.invitationRecipients)
        .set({ openedAt: now })
        .where(eq(schema.invitationRecipients.id, rec.id));
      await this.refreshStats(inv.id);
    }

    const refreshed = await this.db
      .select()
      .from(schema.invitationRecipients)
      .where(eq(schema.invitationRecipients.id, rec.id))
      .limit(1);
    const r = refreshed[0]!;

    return {
      guestName: r.guestName,
      invitation: {
        id: inv.id,
        title: inv.title,
        templateId: inv.templateId as InviteTemplateId,
        content,
        status: "published",
      },
      event: {
        slug: event.slug,
        title: event.title,
        type: event.type,
        date: event.date,
        location: event.location,
        organizer: event.organizer,
      },
      rsvp: {
        status: r.rsvpStatus as RsvpStatus,
        at: r.rsvpAt ?? null,
        partySize: r.rsvpPartySize,
        message: r.rsvpMessage,
        deadlinePassed: this.deadlinePassed(content),
      },
    };
  }

  async submitRsvp(
    viewToken: string,
    body: {
      status: "accepted" | "declined" | "maybe";
      partySize?: number;
      message?: string;
    }
  ): Promise<PublicInviteDto> {
    const recRows = await this.db
      .select()
      .from(schema.invitationRecipients)
      .where(eq(schema.invitationRecipients.viewToken, viewToken))
      .limit(1);
    const rec = recRows[0];
    if (!rec) throw new NotFoundException("Invitation not found.");

    const invRows = await this.db
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.id, rec.invitationId))
      .limit(1);
    const inv = invRows[0];
    if (!inv || inv.status !== "published") {
      throw new NotFoundException("Invitation not found.");
    }

    const content = parseContent(inv.contentJson);
    if (!content.rsvpEnabled) {
      throw new BadRequestException("RSVP is not enabled for this invitation.");
    }
    if (this.deadlinePassed(content)) {
      throw new BadRequestException("RSVP deadline has passed.");
    }

    const prev = rec.rsvpStatus as RsvpStatus;
    const next = body.status;
    const now = formatMysqlDateTimeUtc(new Date());
    const partySize =
      body.partySize != null && body.partySize > 0
        ? Math.min(99, Math.floor(body.partySize))
        : null;
    const message = body.message?.trim().slice(0, 500) || null;

    await this.db
      .update(schema.invitationRecipients)
      .set({
        rsvpStatus: next,
        rsvpAt: now,
        rsvpPartySize: partySize,
        rsvpMessage: message,
      })
      .where(eq(schema.invitationRecipients.id, rec.id));

    await this.adjustRsvpCounts(inv.id, prev, next);
    this.audit.logSafe({
      actorType: "system",
      action: AuditAction.invitation.rsvpSubmitted,
      entityType: "invitation",
      entityId: inv.id,
      metadata: { invitationId: inv.id, response: next },
    });
    return this.getPublic(viewToken);
  }

  private async adjustRsvpCounts(
    invitationId: string,
    prev: RsvpStatus,
    next: RsvpStatus
  ) {
    const rows = await this.db
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.id, invitationId))
      .limit(1);
    const inv = rows[0];
    if (!inv) return;

    const dec = (s: RsvpStatus) => {
      if (s === "accepted") return { yes: -1, no: 0, maybe: 0 };
      if (s === "declined") return { yes: 0, no: -1, maybe: 0 };
      if (s === "maybe") return { yes: 0, no: 0, maybe: -1 };
      return { yes: 0, no: 0, maybe: 0 };
    };
    const inc = (s: RsvpStatus) => {
      if (s === "accepted") return { yes: 1, no: 0, maybe: 0 };
      if (s === "declined") return { yes: 0, no: 1, maybe: 0 };
      if (s === "maybe") return { yes: 0, no: 0, maybe: 1 };
      return { yes: 0, no: 0, maybe: 0 };
    };

    const d = dec(prev);
    const i = inc(next);
    const now = formatMysqlDateTimeUtc(new Date());
    await this.db
      .update(schema.invitations)
      .set({
        rsvpYesCount: Math.max(0, inv.rsvpYesCount + d.yes + i.yes),
        rsvpNoCount: Math.max(0, inv.rsvpNoCount + d.no + i.no),
        rsvpMaybeCount: Math.max(0, inv.rsvpMaybeCount + d.maybe + i.maybe),
        updatedAt: now,
      })
      .where(eq(schema.invitations.id, invitationId));
  }

  private async eventSlugForId(eventId: string): Promise<string | null> {
    const rows = await this.db
      .select({ slug: schema.events.slug })
      .from(schema.events)
      .where(eq(schema.events.id, eventId))
      .limit(1);
    return rows[0]?.slug ?? null;
  }

  private async resolvePhotoStorageKey(
    content: InviteCardContent,
    eventSlug: string,
    invitationId: string
  ): Promise<string | null> {
    if (content.photoUrl?.trim() === "none") return null;
    const key = content.photoKey?.trim();
    if (key && isInvitationPhotoKey(key, invitationId)) {
      return key;
    }
    return this.events.getEventImageKeyForGallerySlot(eventSlug, 0);
  }

  async saveInvitationPhoto(
    userId: string,
    invitationId: string,
    buffer: Buffer,
    mime: string
  ): Promise<{ key: string; photoUrl: string }> {
    await this.getOwnedInvitation(userId, invitationId);
    if (!this.storage.isConfigured()) {
      throw new BadRequestException("Image storage is not configured.");
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"] as const;
    if (!allowed.includes(mime as (typeof allowed)[number])) {
      throw new BadRequestException(
        "Only JPEG, PNG, or WebP images are allowed."
      );
    }
    const ext =
      mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const key = invitationPhotoKey(invitationId, ext);
    const inv = await this.getOwnedInvitation(userId, invitationId);
    const content = parseContent(inv.contentJson);
    const oldKey = content.photoKey?.trim();
    if (oldKey && isInvitationPhotoKey(oldKey, invitationId)) {
      await this.storage.deleteObject(oldKey);
    }
    await this.storage.putObject(key, buffer, mime);
    const merged: InviteCardContent = {
      ...content,
      photoKey: key,
      photoUrl: undefined,
    };
    const now = formatMysqlDateTimeUtc(new Date());
    await this.db
      .update(schema.invitations)
      .set({
        contentJson: inviteContentToJson(merged),
        updatedAt: now,
      })
      .where(eq(schema.invitations.id, invitationId));
    const photoUrl = `/api/v1/invitations/${invitationId}/photo`;
    return { key, photoUrl };
  }

  async resetInvitationPhotoToEvent(
    userId: string,
    invitationId: string
  ): Promise<InvitationDetailDto> {
    const inv = await this.getOwnedInvitation(userId, invitationId);
    const slug = await this.eventSlugForId(inv.eventId);
    if (!slug) throw new NotFoundException("Event not found.");
    const eventRows = await this.db
      .select({ imageUrls: schema.events.imageUrls })
      .from(schema.events)
      .where(eq(schema.events.id, inv.eventId))
      .limit(1);
    const content = parseContent(inv.contentJson);
    const oldKey = content.photoKey?.trim();
    if (oldKey && isInvitationPhotoKey(oldKey, invitationId)) {
      await this.storage.deleteObject(oldKey);
    }
    const merged: InviteCardContent = { ...content, photoKey: undefined };
    if (eventHasStoredImages(eventRows[0]?.imageUrls)) {
      merged.photoUrl = eventGalleryPhotoUrl(slug);
    } else {
      merged.photoUrl = "none";
    }
    const now = formatMysqlDateTimeUtc(new Date());
    await this.db
      .update(schema.invitations)
      .set({
        contentJson: inviteContentToJson(merged),
        updatedAt: now,
      })
      .where(eq(schema.invitations.id, invitationId));
    return this.getDetail(userId, invitationId);
  }

  async clearInvitationPhoto(
    userId: string,
    invitationId: string
  ): Promise<InvitationDetailDto> {
    const inv = await this.getOwnedInvitation(userId, invitationId);
    const content = parseContent(inv.contentJson);
    const oldKey = content.photoKey?.trim();
    if (oldKey && isInvitationPhotoKey(oldKey, invitationId)) {
      await this.storage.deleteObject(oldKey);
    }
    const merged: InviteCardContent = {
      ...content,
      photoKey: undefined,
      photoUrl: "none",
    };
    const now = formatMysqlDateTimeUtc(new Date());
    await this.db
      .update(schema.invitations)
      .set({
        contentJson: inviteContentToJson(merged),
        updatedAt: now,
      })
      .where(eq(schema.invitations.id, invitationId));
    return this.getDetail(userId, invitationId);
  }

  async streamInvitationPhoto(
    userId: string | null,
    invitationId: string
  ): Promise<{ body: Readable; contentType: string } | null> {
    const invRows = await this.db
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.id, invitationId))
      .limit(1);
    const inv = invRows[0];
    if (!inv) return null;
    if (userId != null && inv.userId !== userId) {
      throw new ForbiddenException("Not allowed.");
    }
    const slug = await this.eventSlugForId(inv.eventId);
    if (!slug) return null;
    const content = parseContent(inv.contentJson);
    const key = await this.resolvePhotoStorageKey(
      content,
      slug,
      invitationId
    );
    if (!key) return null;
    return this.storage.getObjectStream(key);
  }

  async streamPublicInvitePhoto(
    viewToken: string
  ): Promise<{ body: Readable; contentType: string } | null> {
    const recRows = await this.db
      .select()
      .from(schema.invitationRecipients)
      .where(eq(schema.invitationRecipients.viewToken, viewToken))
      .limit(1);
    const rec = recRows[0];
    if (!rec) return null;
    const invRows = await this.db
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.id, rec.invitationId))
      .limit(1);
    const inv = invRows[0];
    if (!inv || inv.status !== "published") return null;
    return this.streamInvitationPhoto(null, inv.id);
  }
}
