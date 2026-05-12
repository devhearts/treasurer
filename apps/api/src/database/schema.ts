import {
  mysqlTable,
  varchar,
  int,
  text,
  datetime,
  tinyint,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 }).notNull(),
    /** Null until the user completes email verification. */
    emailVerifiedAt: datetime("email_verified_at", {
      mode: "string",
      fsp: 3,
    }),
  },
  (t) => [uniqueIndex("uq_users_email").on(t.email)]
);

export const passwordResetTokens = mysqlTable(
  "password_reset_tokens",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "string", fsp: 3 }).notNull(),
  },
  (t) => [
    index("idx_password_reset_token_hash").on(t.tokenHash),
    index("idx_password_reset_expires").on(t.expiresAt),
  ]
);

export const emailVerificationTokens = mysqlTable(
  "email_verification_tokens",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "string", fsp: 3 }).notNull(),
  },
  (t) => [
    index("idx_email_verification_token_hash").on(t.tokenHash),
    index("idx_email_verification_expires").on(t.expiresAt),
    index("idx_email_verification_user_id").on(t.userId),
  ]
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "string", fsp: 3 }).notNull(),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 }).notNull(),
    ip: varchar("ip", { length: 45 }),
    userAgent: varchar("user_agent", { length: 512 }),
  },
  (t) => [index("idx_sessions_user_id").on(t.userId)]
);

export const events = mysqlTable(
  "events",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }),
    slug: varchar("slug", { length: 191 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    organizer: varchar("organizer", { length: 255 }).notNull(),
    treasurerPhone: varchar("treasurer_phone", { length: 32 }).notNull(),
    description: text("description").notNull(),
    targetAmount: int("target_amount").notNull(),
    raisedAmount: int("raised_amount").notNull().default(0),
    date: varchar("date", { length: 32 }).notNull(),
    location: varchar("location", { length: 500 }).notNull(),
    createdAt: varchar("created_at", { length: 32 }).notNull(),
    subscriptionPaid: tinyint("subscription_paid").notNull().default(0),
  },
  (t) => [
    uniqueIndex("idx_events_slug").on(t.slug),
    index("idx_events_user_id").on(t.userId),
  ]
);

export const budgetItems = mysqlTable(
  "budget_items",
  {
    id: varchar("id", { length: 64 }).notNull(),
    eventId: varchar("event_id", { length: 36 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    amount: int("amount").notNull(),
  },
  (t) => [index("idx_budget_items_event_id").on(t.eventId)]
);

export const milestoneItems = mysqlTable(
  "milestone_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    eventId: varchar("event_id", { length: 36 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    targetAmount: int("target_amount").notNull(),
  },
  (t) => [index("idx_milestone_items_event_id").on(t.eventId)]
);

export const contributions = mysqlTable(
  "contributions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    eventId: varchar("event_id", { length: 36 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    anonymous: tinyint("anonymous").notNull(),
    amount: int("amount").notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    message: text("message"),
    status: varchar("status", { length: 16 }).notNull(),
    date: varchar("date", { length: 32 }).notNull(),
    pledgeHopeBy: varchar("pledge_hope_by", { length: 32 }),
    manual: tinyint("manual").default(0),
    visible: tinyint("visible").notNull().default(1),
    milestoneId: varchar("milestone_id", { length: 36 }),
    paymentReferenceId: varchar("payment_reference_id", { length: 36 }),
  },
  (t) => [index("idx_contributions_event_id").on(t.eventId)]
);

/** Unified in-flight payments: public contributions + authenticated subscription fees. */
export const paymentIntents = mysqlTable(
  "payment_intents",
  {
    referenceId: varchar("reference_id", { length: 36 }).primaryKey(),
    kind: varchar("kind", { length: 32 }).notNull(), // contribution | subscription
    userId: varchar("user_id", { length: 36 }), // required for subscription
    eventId: varchar("event_id", { length: 36 }), // required for contribution
    amount: int("amount").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    anonymous: tinyint("anonymous").notNull().default(0),
    phone: varchar("phone", { length: 32 }).notNull(),
    message: text("message"),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    /** For contribution flow: contribution row created. For subscription: fee verified server-side. */
    fulfilled: tinyint("fulfilled").notNull().default(0),
    milestoneId: varchar("milestone_id", { length: 36 }),
    processor: varchar("processor", { length: 32 }).notNull().default("mtn_momo"),
    currency: varchar("currency", { length: 8 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 }).notNull(),
    updatedAt: datetime("updated_at", { mode: "string", fsp: 3 }).notNull(),
  },
  (t) => [
    index("idx_payment_intents_event").on(t.eventId),
    index("idx_payment_intents_user").on(t.userId),
  ]
);

export const paymentStatusEvents = mysqlTable(
  "payment_status_events",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    referenceId: varchar("reference_id", { length: 36 }).notNull(),
    source: varchar("source", { length: 32 }).notNull(), // poll | webhook
    fromStatus: varchar("from_status", { length: 32 }),
    toStatus: varchar("to_status", { length: 32 }).notNull(),
    meta: json("meta").$type<Record<string, unknown>>(),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 }).notNull(),
  },
  (t) => [index("idx_payment_status_ref").on(t.referenceId)]
);

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    occurredAt: datetime("occurred_at", { mode: "string", fsp: 3 }).notNull(),
    actorUserId: varchar("actor_user_id", { length: 36 }),
    actorType: varchar("actor_type", { length: 32 }).notNull(),
    action: varchar("action", { length: 128 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }),
    entityId: varchar("entity_id", { length: 64 }),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    ip: varchar("ip", { length: 45 }),
    userAgent: varchar("user_agent", { length: 512 }),
    requestId: varchar("request_id", { length: 64 }),
  },
  (t) => [
    index("idx_audit_entity").on(t.entityType, t.entityId),
    index("idx_audit_occurred").on(t.occurredAt),
  ]
);

export const processedWebhooks = mysqlTable("processed_webhooks", {
  id: varchar("id", { length: 128 }).primaryKey(),
  createdAt: datetime("created_at", { mode: "string", fsp: 3 }).notNull(),
});
