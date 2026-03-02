import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
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
