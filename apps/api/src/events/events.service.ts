import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import type { DrizzleDb } from "../database/database.module";
import { DRIZZLE } from "../database/database.module";
import * as schema from "../database/schema";
import { PaymentsService } from "../payments/payments.service";
import { PaymentProcessorFactory } from "../payments/payment-processor.factory";
import { AuditService } from "../audit/audit.service";
import { ConfigService } from "@nestjs/config";
import { StorageService } from "../integrations/storage.service";
import { ContributionNotificationsService } from "../integrations/contribution-notifications.service";
import type { Readable } from "node:stream";

export type CeremonyEventDto = {
  id: string;
  userId?: string;
  slug: string;
  title: string;
  type: string;
  organizer: string;
  treasurerPhone: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  date: string;
  location: string;
  createdAt: string;
  subscriptionPaid: boolean;
  /**
   * On read: public proxied URLs (`/api/v1/events/by-slug/.../gallery/N`).
   * On create (POST body): Garage object keys `events/{eventId}/{slot}.ext`.
   */
  imageUrls?: string[] | null;
  budgetItems: { id: string; name: string; amount: number }[];
  milestoneItems: {
    id: string;
    name: string;
    targetAmount: number;
    raisedAmount: number;
  }[];
  contributions: {
    id: string;
    eventId: string;
    name: string;
    anonymous: boolean;
    amount: number;
    phone: string;
    message?: string;
    status: "paid" | "pledged";
    date: string;
    pledgeHopeBy?: string;
    manual?: boolean;
    visible?: boolean;
    milestoneId?: string;
  }[];
};

const MAX_EVENT_IMAGES = 3;

/** Matches `events.id` (varchar 36): single Garage path segment, no slashes. */
const EVENT_ID_PATH_SEGMENT_RE = /^[-a-zA-Z0-9_]{1,36}$/;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isEventImageGarageKey(key: string, eventId: string): boolean {
  if (!EVENT_ID_PATH_SEGMENT_RE.test(eventId)) return false;
  const re = new RegExp(
    `^events/${escapeRegExp(eventId)}/[0-2]\\.(jpg|jpeg|png|webp)$`,
    "i"
  );
  return re.test(key);
}

function slotFromEventImageKey(key: string): number {
  const m = /\/([0-2])\./.exec(key);
  return m ? parseInt(m[1], 10) : 0;
}

function normalizeIncomingImageKeys(
  eventId: string,
  raw: unknown
): string[] | null {
  if (raw === undefined || raw === null) return null;
  if (!Array.isArray(raw)) return null;
  const bySlot = new Map<number, string>();
  for (const item of raw) {
    if (bySlot.size >= MAX_EVENT_IMAGES) break;
    if (typeof item !== "string" || !item.trim()) continue;
    const s = item.trim();
    if (!isEventImageGarageKey(s, eventId)) continue;
    bySlot.set(slotFromEventImageKey(s), s);
    if (bySlot.size >= MAX_EVENT_IMAGES) break;
  }
  if (!bySlot.size) return null;
  return Array.from(bySlot.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);
}

function galleryPublicUrls(slug: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    `/api/v1/events/by-slug/${encodeURIComponent(slug)}/gallery/${i}`
  );
}

function imageUrlsFromRow(raw: unknown): string[] | undefined {
  if (raw == null) return undefined;
  /** mysql2 often returns JSON columns as a string; Drizzle passes that through unchanged. */
  let parsed: unknown = raw;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return undefined;
    }
  }
  if (!Array.isArray(parsed)) return undefined;
  const out = parsed.filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0
  );
  return out.length ? out.slice(0, MAX_EVENT_IMAGES) : undefined;
}

/** Drizzle wraps driver errors in `cause`; MySQL duplicate key uses errno 1062 there. */
function isMysqlDuplicateKeyError(e: unknown): boolean {
  let cur: unknown = e;
  for (let i = 0; i < 12 && cur != null; i++) {
    if (typeof cur === "object") {
      const o = cur as {
        errno?: number;
        code?: string;
        message?: string;
        cause?: unknown;
      };
      if (o.errno === 1062 || o.code === "ER_DUP_ENTRY") return true;
      if (
        typeof o.message === "string" &&
        o.message.includes("Duplicate entry")
      ) {
        return true;
      }
    }
    cur =
      typeof cur === "object" &&
      cur !== null &&
      "cause" in cur &&
      (cur as { cause: unknown }).cause != null
        ? (cur as { cause: unknown }).cause
        : undefined;
  }
  return false;
}

@Injectable()
export class EventsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly payments: PaymentsService,
    private readonly processors: PaymentProcessorFactory,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    private readonly contributionNotifications: ContributionNotificationsService
  ) {}

  private raisedForMilestone(
    contributionRows: {
      amount: number;
      milestoneId?: string | null;
      visible?: number | null;
    }[],
    milestoneId: string
  ): number {
    return contributionRows.reduce((sum, c) => {
      if ((c.milestoneId ?? null) !== milestoneId) return sum;
      if (c.visible === 0) return sum;
      return sum + c.amount;
    }, 0);
  }

  private async buildEvent(
    row: typeof schema.events.$inferSelect
  ): Promise<CeremonyEventDto> {
    const budgetRows = await this.db
      .select()
      .from(schema.budgetItems)
      .where(eq(schema.budgetItems.eventId, row.id));
    const msRows = await this.db
      .select()
      .from(schema.milestoneItems)
      .where(eq(schema.milestoneItems.eventId, row.id));
    const contributionRows = await this.db
      .select()
      .from(schema.contributions)
      .where(eq(schema.contributions.eventId, row.id));

    const milestoneItems = msRows.map((m) => ({
      id: m.id,
      name: m.name,
      targetAmount: m.targetAmount,
      raisedAmount: this.raisedForMilestone(contributionRows, m.id),
    }));

    const storedKeys = imageUrlsFromRow(row.imageUrls);
    const garageKeys =
      storedKeys?.filter((k) => isEventImageGarageKey(k, row.id)) ?? [];
    garageKeys.sort(
      (a, b) => slotFromEventImageKey(a) - slotFromEventImageKey(b)
    );
    const imageUrls =
      garageKeys.length > 0
        ? galleryPublicUrls(row.slug, garageKeys.length)
        : undefined;

    return {
      id: row.id,
      userId: row.userId ?? undefined,
      slug: row.slug,
      title: row.title,
      type: row.type,
      organizer: row.organizer,
      treasurerPhone: row.treasurerPhone,
      description: row.description,
      targetAmount: row.targetAmount,
      raisedAmount: row.raisedAmount,
      date: row.date,
      location: row.location,
      createdAt: row.createdAt,
      subscriptionPaid: !!row.subscriptionPaid,
      imageUrls,
      budgetItems: budgetRows.map((b) => ({
        id: b.id,
        name: b.name,
        amount: b.amount,
      })),
      milestoneItems,
      contributions: contributionRows.map((c) => ({
        id: c.id,
        eventId: c.eventId,
        name: c.name,
        anonymous: !!c.anonymous,
        amount: c.amount,
        phone: c.phone,
        message: c.message ?? undefined,
        status: c.status as "paid" | "pledged",
        date: c.date,
        pledgeHopeBy: c.pledgeHopeBy ?? undefined,
        manual: !!c.manual,
        visible: c.visible === 0 ? false : undefined,
        milestoneId: c.milestoneId ?? undefined,
      })),
    };
  }

  async getBySlug(slug: string): Promise<CeremonyEventDto | undefined> {
    const rows = await this.db
      .select()
      .from(schema.events)
      .where(eq(schema.events.slug, slug))
      .limit(1);
    const row = rows[0];
    if (!row) return undefined;
    return this.buildEvent(row);
  }

  async listMine(userId: string): Promise<CeremonyEventDto[]> {
    const eventRows = await this.db
      .select()
      .from(schema.events)
      .where(eq(schema.events.userId, userId));
    const out: CeremonyEventDto[] = [];
    for (const row of eventRows) {
      out.push(await this.buildEvent(row));
    }
    return out;
  }

  /** Sorted Garage keys for this event row (for owner edit / uploads). */
  private sortedGarageKeysFromRow(
    row: typeof schema.events.$inferSelect
  ): string[] {
    const keys = imageUrlsFromRow(row.imageUrls);
    const garageKeys =
      keys?.filter((k) => isEventImageGarageKey(k, row.id)) ?? [];
    garageKeys.sort(
      (a, b) => slotFromEventImageKey(a) - slotFromEventImageKey(b)
    );
    return garageKeys;
  }

  /**
   * Owner-only payload for the edit UI: full event DTO plus raw Garage keys
   * (client uploads use `events/{eventId}/{slot}.ext`).
   */
  async getForEdit(
    userId: string,
    slug: string
  ): Promise<{ event: CeremonyEventDto; imageGarageKeys: string[] } | undefined> {
    const rows = await this.db
      .select()
      .from(schema.events)
      .where(eq(schema.events.slug, slug))
      .limit(1);
    const row = rows[0];
    if (!row) return undefined;
    if (!row.userId || row.userId !== userId) return undefined;
    const event = await this.buildEvent(row);
    return { event, imageGarageKeys: this.sortedGarageKeysFromRow(row) };
  }

  async updateEventForOwner(
    userId: string,
    slug: string,
    body: {
      title: string;
      type: string;
      organizer: string;
      treasurerPhone: string;
      description: string;
      date: string;
      location: string;
      targetAmount: number;
      imageUrls?: string[] | null;
    }
  ): Promise<void> {
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

    const title = (body.title ?? "").trim() || "Event";
    const type = (body.type ?? "").trim() || "other";
    const organizer = (body.organizer ?? "").trim();
    const treasurerPhone = (body.treasurerPhone ?? "").trim();
    const description = (body.description ?? "").trim();
    const date = (body.date ?? "").trim();
    const location = (body.location ?? "").trim();
    if (!organizer) throw new BadRequestException("Organizer is required.");
    if (!treasurerPhone) throw new BadRequestException("Treasurer phone is required.");
    if (!date) throw new BadRequestException("Event date is required.");
    if (!location) throw new BadRequestException("Location is required.");

    const targetAmount = Math.max(
      0,
      Math.round(Number(body.targetAmount) || 0)
    );

    const imageKeys =
      body.imageUrls !== undefined
        ? normalizeIncomingImageKeys(row.id, body.imageUrls)
        : undefined;

    if (imageKeys?.length && !this.storage.isConfigured()) {
      throw new BadRequestException("Image storage is not configured.");
    }
    if (imageKeys) {
      for (const k of imageKeys) {
        const ok = await this.storage.headObject(k);
        if (!ok) {
          throw new BadRequestException(
            "One or more images are missing or invalid."
          );
        }
      }
    }

    const previousKeys = this.sortedGarageKeysFromRow(row);
    const nextSet = new Set(imageKeys ?? []);

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.events)
        .set({
          title: title.slice(0, 500),
          type: type.slice(0, 32),
          organizer: organizer.slice(0, 255),
          treasurerPhone: treasurerPhone.slice(0, 32),
          description,
          date: date.slice(0, 32),
          location: location.slice(0, 500),
          targetAmount,
          ...(imageKeys !== undefined ? { imageUrls: imageKeys } : {}),
        })
        .where(eq(schema.events.id, row.id));

      await tx
        .delete(schema.budgetItems)
        .where(eq(schema.budgetItems.eventId, row.id));
      if (targetAmount > 0) {
        await tx.insert(schema.budgetItems).values({
          id: "target",
          eventId: row.id,
          name: "Target",
          amount: targetAmount,
        });
      }
    });

    if (imageKeys !== undefined) {
      for (const old of previousKeys) {
        if (!nextSet.has(old)) {
          await this.storage.deleteObject(old).catch(() => undefined);
        }
      }
    }

    await this.audit.log({
      actorType: "user",
      actorUserId: userId,
      action: "event.updated",
      entityType: "event",
      entityId: row.id,
      metadata: { slug: row.slug },
    });
  }

  private slugWithNumericSuffix(base: string, n: number, maxLen = 191): string {
    const suffix = `-${n}`;
    if (base.length + suffix.length <= maxLen) return `${base}${suffix}`;
    return `${base.slice(0, Math.max(1, maxLen - suffix.length))}${suffix}`;
  }

  async addEvent(
    userId: string,
    event: CeremonyEventDto,
    subscriptionPaymentReferenceId?: string | null
  ): Promise<{ slug: string }> {
    const processor = this.processors.getProcessor();
    const feature =
      this.config.get<boolean>("app.featureSubscriptionPayment") ?? false;
    if (event.subscriptionPaid && feature && processor.isConfigured()) {
      await this.payments.assertSubscriptionIntentForUser(
        userId,
        subscriptionPaymentReferenceId ?? undefined
      );
    }

    const imageKeys = normalizeIncomingImageKeys(event.id, event.imageUrls);
    if (imageKeys?.length && !this.storage.isConfigured()) {
      throw new BadRequestException("Image storage is not configured.");
    }
    if (imageKeys) {
      for (const k of imageKeys) {
        const ok = await this.storage.headObject(k);
        if (!ok) {
          throw new BadRequestException(
            "One or more images are missing or invalid."
          );
        }
      }
    }

    let slug = event.slug;
    let attempt = 0;
    while (attempt < 8) {
      try {
        await this.db.transaction(async (tx) => {
          await tx.insert(schema.events).values({
            id: event.id,
            userId,
            slug,
            title: event.title,
            type: event.type,
            organizer: event.organizer,
            treasurerPhone: event.treasurerPhone,
            description: event.description,
            targetAmount: event.targetAmount,
            raisedAmount: event.raisedAmount,
            date: event.date,
            location: event.location,
            createdAt: event.createdAt,
            subscriptionPaid: event.subscriptionPaid ? 1 : 0,
            imageUrls: imageKeys,
          });

          for (const b of event.budgetItems) {
            await tx.insert(schema.budgetItems).values({
              id: b.id,
              eventId: event.id,
              name: b.name,
              amount: b.amount,
            });
          }
          for (const m of event.milestoneItems ?? []) {
            await tx.insert(schema.milestoneItems).values({
              id: m.id,
              eventId: event.id,
              name: m.name,
              targetAmount: m.targetAmount,
            });
          }
          for (const c of event.contributions) {
            await tx.insert(schema.contributions).values({
              id: c.id,
              eventId: event.id,
              name: c.name,
              anonymous: c.anonymous ? 1 : 0,
              amount: c.amount,
              phone: c.phone,
              message: c.message ?? null,
              status: c.status,
              date: c.date,
              pledgeHopeBy: c.pledgeHopeBy ?? null,
              manual: c.manual ? 1 : 0,
              visible: c.visible === false ? 0 : 1,
              milestoneId: c.milestoneId ?? null,
              paymentReferenceId: null,
            });
          }
        });

        await this.audit.log({
          actorType: "user",
          actorUserId: userId,
          action: "event.created",
          entityType: "event",
          entityId: event.id,
          metadata: { slug },
        });

        return { slug };
      } catch (e: unknown) {
        if (isMysqlDuplicateKeyError(e)) {
          attempt += 1;
          slug = this.slugWithNumericSuffix(event.slug, attempt);
          continue;
        }
        throw e;
      }
    }
    throw new BadRequestException("Could not allocate a unique event URL.");
  }

  async addContribution(
    eventSlug: string,
    contribution: {
      name: string;
      anonymous: boolean;
      amount: number;
      phone: string;
      message?: string;
      status: "paid" | "pledged";
      date: string;
      pledgeHopeBy?: string;
      manual?: boolean;
      milestoneId?: string;
    }
  ): Promise<void> {
    const event = await this.getBySlug(eventSlug);
    if (!event) throw new BadRequestException("Event not found");

    const mid = contribution.milestoneId?.trim() || null;
    if (mid && !event.milestoneItems.some((m) => m.id === mid)) {
      throw new BadRequestException("Invalid milestone.");
    }

    const id = `c${Date.now()}`;
    const pledgeHopeBy =
      contribution.status === "pledged" && contribution.pledgeHopeBy?.trim()
        ? contribution.pledgeHopeBy.trim()
        : null;

    await this.db.transaction(async (tx) => {
      await tx.insert(schema.contributions).values({
        id,
        eventId: event.id,
        name: contribution.name,
        anonymous: contribution.anonymous ? 1 : 0,
        amount: contribution.amount,
        phone: contribution.phone,
        message: contribution.message ?? null,
        status: contribution.status,
        date: contribution.date,
        pledgeHopeBy,
        manual: contribution.manual ? 1 : 0,
        visible: 1,
        milestoneId: mid,
        paymentReferenceId: null,
      });

      if (contribution.status === "paid") {
        await tx
          .update(schema.events)
          .set({
            raisedAmount: sql`${schema.events.raisedAmount} + ${contribution.amount}`,
          })
          .where(eq(schema.events.id, event.id));
      }
    });

    if (contribution.status === "paid") {
      this.contributionNotifications.notifyPaidContribution({
        ownerUserId: event.userId,
        eventSlug: event.slug,
        eventTitle: event.title,
        contributorName: contribution.name,
        anonymous: contribution.anonymous,
        amount: contribution.amount,
        phone: contribution.phone,
        message: contribution.message,
        manual: contribution.manual,
      });
    }
  }

  async addMilestoneItem(
    userId: string,
    eventSlug: string,
    input: { name: string; targetAmount: number }
  ): Promise<{ id: string }> {
    const event = await this.getBySlug(eventSlug);
    if (!event) throw new BadRequestException("Event not found");
    if (event.userId && event.userId !== userId) {
      throw new ForbiddenException("Not allowed.");
    }
    const name = input.name.trim();
    if (!name) throw new BadRequestException("Enter a name.");
    const target = Math.round(Number(input.targetAmount));
    if (!Number.isFinite(target) || target < 1) {
      throw new BadRequestException("Enter a valid target amount.");
    }
    const id = `ms${Date.now()}`;
    await this.db.insert(schema.milestoneItems).values({
      id,
      eventId: event.id,
      name,
      targetAmount: target,
    });
    return { id };
  }

  async deleteMilestoneItem(
    userId: string,
    eventSlug: string,
    milestoneId: string
  ): Promise<void> {
    const event = await this.getBySlug(eventSlug);
    if (!event) throw new BadRequestException("Event not found");
    if (event.userId && event.userId !== userId) {
      throw new ForbiddenException("Not allowed.");
    }
    if (!event.milestoneItems.some((m) => m.id === milestoneId)) {
      throw new BadRequestException("Milestone not found.");
    }
    await this.db
      .delete(schema.milestoneItems)
      .where(
        and(
          eq(schema.milestoneItems.id, milestoneId),
          eq(schema.milestoneItems.eventId, event.id)
        )
      );
  }

  async setContributionVisibility(
    userId: string,
    eventSlug: string,
    contributionId: string,
    visible: boolean
  ): Promise<void> {
    const event = await this.getBySlug(eventSlug);
    if (!event) throw new BadRequestException("Event not found");
    if (event.userId && event.userId !== userId) {
      throw new ForbiddenException("Not allowed.");
    }
    const contrib = event.contributions.find((c) => c.id === contributionId);
    if (!contrib) throw new BadRequestException("Contribution not found.");

    const wasVisible = contrib.visible !== false;
    if (wasVisible === visible) return;

    const delta = visible ? contrib.amount : -contrib.amount;
    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.contributions)
        .set({ visible: visible ? 1 : 0 })
        .where(
          and(
            eq(schema.contributions.id, contributionId),
            eq(schema.contributions.eventId, event.id)
          )
        );

      await tx
        .update(schema.events)
        .set({
          raisedAmount: sql`GREATEST(0, ${schema.events.raisedAmount} + ${delta})`,
        })
        .where(eq(schema.events.id, event.id));
    });
  }

  /**
   * Image upload: send **`slug`** for an existing event (server uses DB `id`, owner-checked).
   * Send **`eventId` only** for create-draft uploads (row may not exist yet).
   */
  async resolveEventIdForImageUpload(
    userId: string,
    eventId: string | undefined,
    slug: string | undefined
  ): Promise<string> {
    const s = slug?.trim();
    if (s) {
      const rows = await this.db
        .select({ id: schema.events.id, userId: schema.events.userId })
        .from(schema.events)
        .where(eq(schema.events.slug, s))
        .limit(1);
      const row = rows[0];
      if (!row?.userId || row.userId !== userId) {
        throw new NotFoundException();
      }
      return row.id;
    }
    const eid = (eventId ?? "").trim();
    if (!EVENT_ID_PATH_SEGMENT_RE.test(eid)) {
      throw new BadRequestException("Invalid event id.");
    }
    const existing = await this.db
      .select({ userId: schema.events.userId })
      .from(schema.events)
      .where(eq(schema.events.id, eid))
      .limit(1);
    const ex = existing[0];
    if (ex) {
      if (!ex.userId || ex.userId !== userId) {
        throw new ForbiddenException("Not allowed.");
      }
    }
    return eid;
  }

  async saveDraftEventImage(
    eventId: string,
    slot: number,
    buffer: Buffer,
    mime: string
  ): Promise<{ key: string }> {
    if (!this.storage.isConfigured()) {
      throw new BadRequestException("Image storage is not configured.");
    }
    if (!EVENT_ID_PATH_SEGMENT_RE.test(eventId)) {
      throw new BadRequestException("Invalid event id.");
    }
    if (![0, 1, 2].includes(slot)) {
      throw new BadRequestException("Invalid slot.");
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"] as const;
    if (!allowed.includes(mime as (typeof allowed)[number])) {
      throw new BadRequestException(
        "Only JPEG, PNG, or WebP images are allowed."
      );
    }
    const ext =
      mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const key = `events/${eventId}/${slot}.${ext}`;
    await this.storage.putObject(key, buffer, mime);
    return { key };
  }

  async deleteDraftEventImage(key: string): Promise<void> {
    if (!this.storage.isConfigured()) {
      return;
    }
    if (
      !/^events\/[-a-zA-Z0-9_]{1,36}\/[0-2]\.(jpg|jpeg|png|webp)$/i.test(key)
    ) {
      throw new BadRequestException("Invalid image key.");
    }
    await this.storage.deleteObject(key);
  }

  async getEventImageKeyForGallerySlot(
    slug: string,
    slot: number
  ): Promise<string | null> {
    if (slot < 0 || slot > 2) return null;
    const rows = await this.db
      .select({
        id: schema.events.id,
        imageUrls: schema.events.imageUrls,
      })
      .from(schema.events)
      .where(eq(schema.events.slug, slug))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const keys = imageUrlsFromRow(row.imageUrls);
    const garageKeys =
      keys?.filter((k) => isEventImageGarageKey(k, row.id)) ?? [];
    garageKeys.sort(
      (a, b) => slotFromEventImageKey(a) - slotFromEventImageKey(b)
    );
    return garageKeys[slot] ?? null;
  }

  async streamGalleryObject(
    slug: string,
    slot: number
  ): Promise<{ body: Readable; contentType: string } | null> {
    const key = await this.getEventImageKeyForGallerySlot(slug, slot);
    if (!key) return null;
    return this.storage.getObjectStream(key);
  }
}
