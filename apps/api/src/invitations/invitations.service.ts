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
import type { DrizzleDb } from "../database/database.module";
import { DRIZZLE } from "../database/database.module";
import * as schema from "../database/schema";
import { formatMysqlDateTimeUtc } from "../common/mysql-datetime";
import {
  inviteContentToJson,
  type InviteCardContent,
  type InvitationDetailDto,
  type InvitationListItemDto,
  type InvitationRecipientDto,
  type InviteTemplateId,
  type PublicInviteDto,
  type RsvpStatus,
} from "./invitations.types";

function defaultHeadlineForType(type: string): string {
  const labels: Record<string, string> = {
    wedding: "Wedding",
    introduction: "Introduction",
    funeral: "Memorial",
    other: "Celebration",
  };
  return labels[type] ?? "Celebration";
}

function defaultFooterForType(type: string): string {
  const footers: Record<string, string> = {
    wedding: "Reception to follow",
    introduction: "Your presence is requested",
    funeral: "Condolences and support welcome",
    other: "We hope you can join us",
  };
  return footers[type] ?? "We hope you can join us";
}

function formatEventDateForCard(isoDate: string): string {
  const s = isoDate.trim();
  if (!s) return "";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? new Date(`${s}T12:00:00Z`)
    : new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-UG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function parseEventLocation(location: string): {
  venue: string;
  locationLine: string;
} {
  const raw = location.trim();
  if (!raw) return { venue: "", locationLine: "" };
  const parts = raw
    .split(/[,;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    return { venue: parts[0] ?? "", locationLine: "" };
  }
  return { venue: parts[0], locationLine: parts.slice(1).join(", ") };
}

function defaultContentFromEvent(event: {
  title: string;
  organizer: string;
  date: string;
  location: string;
  type: string;
  description: string;
}): InviteCardContent {
  const parts = event.title.split(/\s*&\s*|\s+and\s+/i);
  const name1 = parts[0]?.trim() || event.organizer.trim() || "Host";
  const name2 = parts[1]?.trim() || "";
  const { venue, locationLine } = parseEventLocation(event.location);
  const desc = event.description.trim();
  const footer =
    desc.length > 0 && desc.length <= 120
      ? desc
      : defaultFooterForType(event.type);
  const eventTitle = event.title.trim();

  return {
    name1,
    name2,
    headline: defaultHeadlineForType(event.type),
    date: formatEventDateForCard(event.date),
    time: "",
    venue,
    location: locationLine,
    footer,
    font: "serif",
    accentColor: "#9A7432",
    rsvpEnabled: true,
    rsvpDeadline: event.date.trim().slice(0, 10) || undefined,
    rsvpNote: eventTitle
      ? `Please RSVP for ${eventTitle}.`
      : "Please respond at your earliest convenience.",
  };
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

function parseContent(raw: unknown): InviteCardContent {
  const o = coerceContentJson(raw);
  return {
    name1: String(o.name1 ?? ""),
    name2: String(o.name2 ?? ""),
    headline: String(o.headline ?? "Celebration"),
    date: String(o.date ?? ""),
    time: String(o.time ?? ""),
    venue: String(o.venue ?? ""),
    location: String(o.location ?? ""),
    footer: String(o.footer ?? ""),
    font: (["serif", "sans-serif", "script", "monospace"].includes(
      String(o.font)
    )
      ? o.font
      : "serif") as InviteCardContent["font"],
    accentColor: String(o.accentColor ?? "#9A7432"),
    customMessage: o.customMessage ? String(o.customMessage) : undefined,
    rsvpEnabled: o.rsvpEnabled !== false,
    rsvpDeadline: o.rsvpDeadline ? String(o.rsvpDeadline) : undefined,
    rsvpNote: o.rsvpNote ? String(o.rsvpNote) : undefined,
  };
}

function viewToken(): string {
  return randomBytes(24).toString("base64url");
}

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly config: ConfigService
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
    const content = defaultContentFromEvent(event);
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
      templateId: "royal",
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
    return this.getDetail(userId, invitationId);
  }

  async duplicate(userId: string, invitationId: string): Promise<InvitationDetailDto> {
    const inv = await this.getOwnedInvitation(userId, invitationId);
    const content = parseContent(inv.contentJson);
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
}
