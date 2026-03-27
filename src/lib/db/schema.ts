import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(),
});

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  type: text("type").notNull(), // wedding | introduction | funeral | other
  organizer: text("organizer").notNull(),
  treasurerPhone: text("treasurer_phone").notNull(),
  description: text("description").notNull(),
  targetAmount: integer("target_amount").notNull(),
  raisedAmount: integer("raised_amount").notNull().default(0),
  date: text("date").notNull(),
  location: text("location").notNull(),
  createdAt: text("created_at").notNull(),
  subscriptionPaid: integer("subscription_paid", { mode: "boolean" })
    .notNull()
    .default(false),
});

export const budgetItems = sqliteTable("budget_items", {
  id: text("id").notNull(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
});

export const contributions = sqliteTable("contributions", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  anonymous: integer("anonymous", { mode: "boolean" }).notNull(),
  amount: integer("amount").notNull(),
  phone: text("phone").notNull(),
  message: text("message"),
  status: text("status").notNull(), // paid | pledged
  date: text("date").notNull(),
  manual: integer("manual", { mode: "boolean" }).default(false),
});

/** In-flight MoMo RequestToPay; finalized when status is SUCCESSFUL. */
export const momoPendingPayments = sqliteTable("momo_pending_payments", {
  referenceId: text("reference_id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  name: text("name").notNull(),
  anonymous: integer("anonymous", { mode: "boolean" }).notNull(),
  phone: text("phone").notNull(),
  message: text("message"),
  externalId: text("external_id").notNull(),
  contributionRecorded: integer("contribution_recorded", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull(),
});
