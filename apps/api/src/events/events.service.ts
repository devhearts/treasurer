import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import type { DrizzleDb } from "../database/database.module";
import { DRIZZLE } from "../database/database.module";
import * as schema from "../database/schema";
import { PaymentsService } from "../payments/payments.service";
import { PaymentProcessorFactory } from "../payments/payment-processor.factory";
import { AuditService } from "../audit/audit.service";
import { ConfigService } from "@nestjs/config";

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

@Injectable()
export class EventsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly payments: PaymentsService,
    private readonly processors: PaymentProcessorFactory,
    private readonly audit: AuditService,
    private readonly config: ConfigService
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
        const code = (e as { errno?: number })?.errno;
        const msg = e instanceof Error ? e.message : "";
        if (code === 1062 || msg.includes("Duplicate")) {
          attempt += 1;
          slug = `${event.slug}-${attempt}`;
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
}
