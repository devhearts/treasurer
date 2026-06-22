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
    /** Uganda MSISDN (256…); null for legacy rows before this column existed. */
    phone: varchar("phone", { length: 32 }),
    /** Set when account verification is approved (KYC-lite). */
    accountVerifiedAt: datetime("account_verified_at", {
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
    /** User-specified label when type is "other". */
    typeLabel: varchar("type_label", { length: 48 }),
    organizer: varchar("organizer", { length: 255 }).notNull(),
    treasurerPhone: varchar("treasurer_phone", { length: 32 }).notNull(),
    description: text("description").notNull(),
    targetAmount: int("target_amount").notNull(),
    raisedAmount: int("raised_amount").notNull().default(0),
    date: varchar("date", { length: 32 }).notNull(),
    location: varchar("location", { length: 500 }).notNull(),
    createdAt: varchar("created_at", { length: 32 }).notNull(),
    subscriptionPaid: tinyint("subscription_paid").notNull().default(0),
    /** Up to 3 Garage object keys (`events/{eventId}/{slot}.ext`); mysql2 may return this column as a JSON string — see `imageUrlsFromRow` in events.service. */
    imageUrls: json("image_urls").$type<string[] | null>(),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    statusMessage: text("status_message"),
    preSuspendStatus: varchar("pre_suspend_status", { length: 16 }),
    suspendReason: varchar("suspend_reason", { length: 500 }),
    statusChangedAt: varchar("status_changed_at", { length: 32 }),
  },
  (t) => [
    uniqueIndex("idx_events_slug").on(t.slug),
    index("idx_events_user_id").on(t.userId),
    index("idx_events_status").on(t.status),
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

/** Terminal deposit reconciliation outcomes for stale payment intents. */
export const reconciledPaymentIntents = mysqlTable(
  "reconciled_payment_intents",
  {
    referenceId: varchar("reference_id", { length: 36 }).primaryKey(),
    outcome: varchar("outcome", { length: 32 }).notNull(), // completed | failed
    kind: varchar("kind", { length: 32 }).notNull(), // contribution | subscription
    processor: varchar("processor", { length: 32 }).notNull(),
    providerStatus: varchar("provider_status", { length: 32 }).notNull(),
    failureCode: varchar("failure_code", { length: 64 }),
    failureMessage: text("failure_message"),
    providerPayload: json("provider_payload").$type<Record<string, unknown>>(),
    reconciledAt: datetime("reconciled_at", { mode: "string", fsp: 3 }).notNull(),
  },
  (t) => [index("idx_reconciled_payment_intents_reconciled_at").on(t.reconciledAt)]
);

export const paymentStatusEvents = mysqlTable(
  "payment_status_events",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    referenceId: varchar("reference_id", { length: 36 }).notNull(),
    source: varchar("source", { length: 32 }).notNull(), // poll | webhook | reconciliation
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

/** Per-user wallet balance (custodial ledger). */
export const userWallets = mysqlTable(
  "user_wallets",
  {
    userId: varchar("user_id", { length: 36 }).primaryKey(),
    balance: int("balance").notNull().default(0),
    totalIn: int("total_in").notNull().default(0),
    totalOut: int("total_out").notNull().default(0),
    currency: varchar("currency", { length: 8 }).notNull().default("UGX"),
    updatedAt: datetime("updated_at", { mode: "string", fsp: 3 }).notNull(),
  },
  (t) => [index("idx_user_wallets_updated").on(t.updatedAt)]
);

export const walletTransactions = mysqlTable(
  "wallet_transactions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    direction: varchar("direction", { length: 8 }).notNull(), // in | out
    kind: varchar("kind", { length: 32 }).notNull(),
    amount: int("amount").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    badge: varchar("badge", { length: 64 }),
    eventId: varchar("event_id", { length: 36 }),
    contributionId: varchar("contribution_id", { length: 36 }),
    withdrawalId: varchar("withdrawal_id", { length: 36 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 }).notNull(),
  },
  (t) => [
    index("idx_wallet_tx_user_created").on(t.userId, t.createdAt),
    index("idx_wallet_tx_contribution").on(t.contributionId),
  ]
);

export const payoutMethods = mysqlTable(
  "payout_methods",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(), // mtn_momo | airtel_momo | bank
    label: varchar("label", { length: 255 }).notNull(),
    msisdn: varchar("msisdn", { length: 32 }),
    accountNumber: varchar("account_number", { length: 64 }),
    bankName: varchar("bank_name", { length: 255 }),
    branch: varchar("branch", { length: 255 }),
    swift: varchar("swift", { length: 32 }),
    isDefault: tinyint("is_default").notNull().default(0),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 }).notNull(),
  },
  (t) => [index("idx_payout_methods_user").on(t.userId)]
);

export const withdrawals = mysqlTable(
  "withdrawals",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    reference: varchar("reference", { length: 64 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    methodId: varchar("method_id", { length: 36 }).notNull(),
    grossAmount: int("gross_amount").notNull(),
    momoFee: int("momo_fee").notNull(),
    platformFee: int("platform_fee").notNull(),
    netAmount: int("net_amount").notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    failureReason: varchar("failure_reason", { length: 512 }),
    processorRef: varchar("processor_ref", { length: 64 }),
    idempotencyKey: varchar("idempotency_key", { length: 64 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 }).notNull(),
    updatedAt: datetime("updated_at", { mode: "string", fsp: 3 }).notNull(),
  },
  (t) => [
    uniqueIndex("uq_withdrawals_reference").on(t.reference),
    index("idx_withdrawals_user").on(t.userId),
    uniqueIndex("uq_withdrawals_idempotency").on(t.userId, t.idempotencyKey),
  ]
);

export const withdrawalOtps = mysqlTable(
  "withdrawal_otps",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    withdrawalId: varchar("withdrawal_id", { length: 36 }).notNull(),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "string", fsp: 3 }).notNull(),
    attempts: int("attempts").notNull().default(0),
    verifiedAt: datetime("verified_at", { mode: "string", fsp: 3 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 }).notNull(),
  },
  (t) => [index("idx_withdrawal_otps_withdrawal").on(t.withdrawalId)]
);

/** Async-generated PDF progress report for a stopped event. */
export const eventProgressReports = mysqlTable(
  "event_progress_reports",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    eventId: varchar("event_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    status: varchar("status", { length: 16 }).notNull(),
    storageKey: varchar("storage_key", { length: 512 }),
    errorMessage: text("error_message"),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 }).notNull(),
    completedAt: datetime("completed_at", { mode: "string", fsp: 3 }),
  },
  (t) => [
    index("idx_event_progress_reports_event_created").on(t.eventId, t.createdAt),
  ]
);

/** Links a withdrawal to the event it draws platform funds from. */
export const withdrawalEvents = mysqlTable(
  "withdrawal_events",
  {
    withdrawalId: varchar("withdrawal_id", { length: 36 }).primaryKey(),
    eventId: varchar("event_id", { length: 36 }).notNull(),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 }).notNull(),
  },
  (t) => [index("idx_withdrawal_events_event").on(t.eventId)]
);

/** Draft payout method awaiting email OTP before insert. */
export const payoutMethodPending = mysqlTable(
  "payout_method_pending",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    msisdn: varchar("msisdn", { length: 32 }),
    accountNumber: varchar("account_number", { length: 64 }),
    bankName: varchar("bank_name", { length: 255 }),
    branch: varchar("branch", { length: 255 }),
    swift: varchar("swift", { length: 32 }),
    isDefault: tinyint("is_default").notNull().default(0),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 }).notNull(),
  },
  (t) => [index("idx_payout_method_pending_user").on(t.userId)]
);

export const payoutMethodOtps = mysqlTable(
  "payout_method_otps",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    pendingId: varchar("pending_id", { length: 36 }).notNull(),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "string", fsp: 3 }).notNull(),
    attempts: int("attempts").notNull().default(0),
    verifiedAt: datetime("verified_at", { mode: "string", fsp: 3 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 }).notNull(),
  },
  (t) => [index("idx_payout_method_otps_pending").on(t.pendingId)]
);

/** Account identity verification (KYC-lite) — one row per user. */
export const accountVerifications = mysqlTable("account_verifications", {
  userId: varchar("user_id", { length: 36 }).primaryKey(),
  status: varchar("status", { length: 32 }).notNull().default("none"),
  legalName: varchar("legal_name", { length: 255 }),
  phoneMsisdn: varchar("phone_msisdn", { length: 32 }),
  selfieKey: varchar("selfie_key", { length: 512 }),
  idFrontKey: varchar("id_front_key", { length: 512 }),
  idBackKey: varchar("id_back_key", { length: 512 }),
  rejectionReason: text("rejection_reason"),
  submittedAt: datetime("submitted_at", { mode: "string", fsp: 3 }),
  reviewedAt: datetime("reviewed_at", { mode: "string", fsp: 3 }),
  reviewedBy: varchar("reviewed_by", { length: 255 }),
  createdAt: datetime("created_at", { mode: "string", fsp: 3 }).notNull(),
  updatedAt: datetime("updated_at", { mode: "string", fsp: 3 }).notNull(),
});

/** Short-lived QR capture session for desktop → phone camera flow. */
export const verificationCaptureSessions = mysqlTable(
  "verification_capture_sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "string", fsp: 3 }).notNull(),
    selfieKey: varchar("selfie_key", { length: 512 }),
    idFrontKey: varchar("id_front_key", { length: 512 }),
    idBackKey: varchar("id_back_key", { length: 512 }),
    consumedAt: datetime("consumed_at", { mode: "string", fsp: 3 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 }).notNull(),
  },
  (t) => [
    index("idx_verification_capture_token").on(t.tokenHash),
    index("idx_verification_capture_user").on(t.userId),
  ]
);

export const invitations = mysqlTable(
  "invitations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    eventId: varchar("event_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    templateId: varchar("template_id", { length: 32 }).notNull(),
    contentJson: json("content_json").$type<Record<string, unknown>>().notNull(),
    status: varchar("status", { length: 16 }).notNull().default("draft"),
    publishedAt: datetime("published_at", { mode: "string", fsp: 3 }),
    recipientCount: int("recipient_count").notNull().default(0),
    openCount: int("open_count").notNull().default(0),
    rsvpYesCount: int("rsvp_yes_count").notNull().default(0),
    rsvpNoCount: int("rsvp_no_count").notNull().default(0),
    rsvpMaybeCount: int("rsvp_maybe_count").notNull().default(0),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 }).notNull(),
    updatedAt: datetime("updated_at", { mode: "string", fsp: 3 }).notNull(),
  },
  (t) => [
    index("idx_invitations_event").on(t.eventId),
    index("idx_invitations_user").on(t.userId),
  ]
);

export const invitationRecipients = mysqlTable(
  "invitation_recipients",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    invitationId: varchar("invitation_id", { length: 36 }).notNull(),
    guestName: varchar("guest_name", { length: 255 }).notNull(),
    contact: varchar("contact", { length: 255 }),
    viewToken: varchar("view_token", { length: 64 }).notNull(),
    openedAt: datetime("opened_at", { mode: "string", fsp: 3 }),
    rsvpStatus: varchar("rsvp_status", { length: 16 }).notNull().default("pending"),
    rsvpAt: datetime("rsvp_at", { mode: "string", fsp: 3 }),
    rsvpPartySize: int("rsvp_party_size"),
    rsvpMessage: varchar("rsvp_message", { length: 500 }),
    createdAt: datetime("created_at", { mode: "string", fsp: 3 }).notNull(),
  },
  (t) => [
    index("idx_invitation_recipients_invitation").on(t.invitationId),
    uniqueIndex("idx_invitation_recipients_token").on(t.viewToken),
  ]
);
