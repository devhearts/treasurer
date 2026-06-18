import { Inject, Injectable } from "@nestjs/common";
import { eq, desc, and, or, lt } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { DrizzleDb } from "../database/database.module";
import { DRIZZLE } from "../database/database.module";
import * as schema from "../database/schema";
import { formatMysqlDateTimeUtc } from "../common/mysql-datetime";
import { formatBalanceCompact } from "./wallet-fees";

type DbTx = Parameters<Parameters<DrizzleDb["transaction"]>[0]>[0];

export interface CreditFromContributionInput {
  userId: string;
  eventId: string;
  contributionId: string;
  amount: number;
  title: string;
  description: string;
}

@Injectable()
export class WalletService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async getOrCreateWallet(userId: string, tx?: DbTx) {
    const db = tx ?? this.db;
    const rows = await db
      .select()
      .from(schema.userWallets)
      .where(eq(schema.userWallets.userId, userId))
      .limit(1);
    if (rows[0]) return rows[0];

    const now = formatMysqlDateTimeUtc(new Date());
    await db.insert(schema.userWallets).values({
      userId,
      balance: 0,
      totalIn: 0,
      totalOut: 0,
      currency: "UGX",
      updatedAt: now,
    });
    const created = await db
      .select()
      .from(schema.userWallets)
      .where(eq(schema.userWallets.userId, userId))
      .limit(1);
    return created[0]!;
  }

  async getAccountSummary(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      userId,
      balance: wallet.balance,
      totalIn: wallet.totalIn,
      totalOut: wallet.totalOut,
      currency: wallet.currency,
      balanceCompact: formatBalanceCompact(wallet.balance, wallet.currency),
    };
  }

  private mapTransactionRow(r: typeof schema.walletTransactions.$inferSelect) {
    return {
      id: r.id,
      userId: r.userId,
      direction: r.direction as "in" | "out",
      kind: r.kind,
      amount: r.amount,
      title: r.title,
      description: r.description ?? "",
      badge: r.badge ?? "",
      eventId: r.eventId,
      contributionId: r.contributionId,
      withdrawalId: r.withdrawalId,
      createdAt: r.createdAt,
    };
  }

  async listTransactions(
    userId: string,
    options?: { limit?: number; cursor?: string; eventId?: string }
  ) {
    const limit = Math.min(
      Math.max(options?.limit ?? 20, 1),
      50
    );
    const conditions = [eq(schema.walletTransactions.userId, userId)];

    if (options?.eventId) {
      const owned = await this.db
        .select({ id: schema.events.id })
        .from(schema.events)
        .where(
          and(
            eq(schema.events.id, options.eventId),
            eq(schema.events.userId, userId)
          )
        )
        .limit(1);
      if (!owned[0]) {
        return { transactions: [], nextCursor: null, hasMore: false };
      }
      conditions.push(eq(schema.walletTransactions.eventId, options.eventId));
    }

    if (options?.cursor) {
      const cur = await this.db
        .select({
          createdAt: schema.walletTransactions.createdAt,
          id: schema.walletTransactions.id,
        })
        .from(schema.walletTransactions)
        .where(
          and(
            eq(schema.walletTransactions.userId, userId),
            eq(schema.walletTransactions.id, options.cursor)
          )
        )
        .limit(1);
      if (cur[0]) {
        conditions.push(
          or(
            lt(schema.walletTransactions.createdAt, cur[0].createdAt),
            and(
              eq(schema.walletTransactions.createdAt, cur[0].createdAt),
              lt(schema.walletTransactions.id, cur[0].id)
            )
          )!
        );
      }
    }

    const rows = await this.db
      .select()
      .from(schema.walletTransactions)
      .where(and(...conditions))
      .orderBy(
        desc(schema.walletTransactions.createdAt),
        desc(schema.walletTransactions.id)
      )
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const transactions = page.map((r) => this.mapTransactionRow(r));
    const nextCursor =
      hasMore && page.length > 0 ? page[page.length - 1]!.id : null;

    return { transactions, nextCursor, hasMore };
  }

  async creditFromContribution(
    tx: DbTx,
    input: CreditFromContributionInput
  ): Promise<void> {
    const existing = await tx
      .select({ id: schema.walletTransactions.id })
      .from(schema.walletTransactions)
      .where(
        and(
          eq(schema.walletTransactions.contributionId, input.contributionId),
          eq(schema.walletTransactions.userId, input.userId)
        )
      )
      .limit(1);
    if (existing[0]) return;

    await this.getOrCreateWallet(input.userId, tx);

    const txId = randomUUID();
    const now = formatMysqlDateTimeUtc(new Date());

    await tx.insert(schema.walletTransactions).values({
      id: txId,
      userId: input.userId,
      direction: "in",
      kind: "contribution",
      amount: input.amount,
      title: input.title,
      description: input.description,
      badge: "in",
      eventId: input.eventId,
      contributionId: input.contributionId,
      withdrawalId: null,
      createdAt: now,
    });

    const walletRows = await tx
      .select()
      .from(schema.userWallets)
      .where(eq(schema.userWallets.userId, input.userId))
      .limit(1);
    const w = walletRows[0]!;

    await tx
      .update(schema.userWallets)
      .set({
        balance: w.balance + input.amount,
        totalIn: w.totalIn + input.amount,
        updatedAt: now,
      })
      .where(eq(schema.userWallets.userId, input.userId));
  }

  async debitForWithdrawal(
    tx: DbTx,
    input: {
      userId: string;
      withdrawalId: string;
      grossAmount: number;
      title: string;
      description: string;
      badge: string;
      eventId?: string | null;
    }
  ): Promise<void> {
    const wallet = await this.getOrCreateWallet(input.userId, tx);
    if (wallet.balance < input.grossAmount) {
      throw new Error("Insufficient balance");
    }

    const now = formatMysqlDateTimeUtc(new Date());
    await tx.insert(schema.walletTransactions).values({
      id: randomUUID(),
      userId: input.userId,
      direction: "out",
      kind: "withdrawal",
      amount: input.grossAmount,
      title: input.title,
      description: input.description,
      badge: input.badge,
      eventId: input.eventId ?? null,
      contributionId: null,
      withdrawalId: input.withdrawalId,
      createdAt: now,
    });

    await tx
      .update(schema.userWallets)
      .set({
        balance: wallet.balance - input.grossAmount,
        totalOut: wallet.totalOut + input.grossAmount,
        updatedAt: now,
      })
      .where(eq(schema.userWallets.userId, input.userId));
  }

  async reverseWithdrawalDebit(
    tx: DbTx,
    input: {
      userId: string;
      withdrawalId: string;
      grossAmount: number;
      title: string;
      description: string;
    }
  ): Promise<void> {
    const wallet = await this.getOrCreateWallet(input.userId, tx);
    const now = formatMysqlDateTimeUtc(new Date());

    await tx.insert(schema.walletTransactions).values({
      id: randomUUID(),
      userId: input.userId,
      direction: "in",
      kind: "adjustment",
      amount: input.grossAmount,
      title: input.title,
      description: input.description,
      badge: "in",
      eventId: null,
      contributionId: null,
      withdrawalId: input.withdrawalId,
      createdAt: now,
    });

    await tx
      .update(schema.userWallets)
      .set({
        balance: wallet.balance + input.grossAmount,
        totalOut: Math.max(0, wallet.totalOut - input.grossAmount),
        updatedAt: now,
      })
      .where(eq(schema.userWallets.userId, input.userId));
  }
}
