CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL,
	`occurred_at` datetime(3) NOT NULL,
	`actor_user_id` varchar(36),
	`actor_type` varchar(32) NOT NULL,
	`action` varchar(128) NOT NULL,
	`entity_type` varchar(64),
	`entity_id` varchar(64),
	`metadata` json,
	`ip` varchar(45),
	`user_agent` varchar(512),
	`request_id` varchar(64),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_items` (
	`id` varchar(64) NOT NULL,
	`event_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`amount` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contributions` (
	`id` varchar(36) NOT NULL,
	`event_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`anonymous` tinyint NOT NULL,
	`amount` int NOT NULL,
	`phone` varchar(32) NOT NULL,
	`message` text,
	`status` varchar(16) NOT NULL,
	`date` varchar(32) NOT NULL,
	`pledge_hope_by` varchar(32),
	`manual` tinyint DEFAULT 0,
	`visible` tinyint NOT NULL DEFAULT 1,
	`milestone_id` varchar(36),
	`payment_reference_id` varchar(36),
	CONSTRAINT `contributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_verification_tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	CONSTRAINT `email_verification_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`slug` varchar(191) NOT NULL,
	`title` varchar(500) NOT NULL,
	`type` varchar(32) NOT NULL,
	`organizer` varchar(255) NOT NULL,
	`treasurer_phone` varchar(32) NOT NULL,
	`description` text NOT NULL,
	`target_amount` int NOT NULL,
	`raised_amount` int NOT NULL DEFAULT 0,
	`date` varchar(32) NOT NULL,
	`location` varchar(500) NOT NULL,
	`created_at` varchar(32) NOT NULL,
	`subscription_paid` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `events_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_events_slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `milestone_items` (
	`id` varchar(36) NOT NULL,
	`event_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`target_amount` int NOT NULL,
	CONSTRAINT `milestone_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_intents` (
	`reference_id` varchar(36) NOT NULL,
	`kind` varchar(32) NOT NULL,
	`user_id` varchar(36),
	`event_id` varchar(36),
	`amount` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`anonymous` tinyint NOT NULL DEFAULT 0,
	`phone` varchar(32) NOT NULL,
	`message` text,
	`external_id` varchar(255) NOT NULL,
	`fulfilled` tinyint NOT NULL DEFAULT 0,
	`milestone_id` varchar(36),
	`processor` varchar(32) NOT NULL DEFAULT 'mtn_momo',
	`currency` varchar(8),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `payment_intents_reference_id` PRIMARY KEY(`reference_id`)
);
--> statement-breakpoint
CREATE TABLE `payment_status_events` (
	`id` varchar(36) NOT NULL,
	`reference_id` varchar(36) NOT NULL,
	`source` varchar(32) NOT NULL,
	`from_status` varchar(32),
	`to_status` varchar(32) NOT NULL,
	`meta` json,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `payment_status_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `processed_webhooks` (
	`id` varchar(128) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `processed_webhooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`ip` varchar(45),
	`user_agent` varchar(512),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`email_verified_at` datetime(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_users_email` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_occurred` ON `audit_logs` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_budget_items_event_id` ON `budget_items` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_contributions_event_id` ON `contributions` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_email_verification_token_hash` ON `email_verification_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_email_verification_expires` ON `email_verification_tokens` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_email_verification_user_id` ON `email_verification_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_events_user_id` ON `events` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_milestone_items_event_id` ON `milestone_items` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_password_reset_token_hash` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_password_reset_expires` ON `password_reset_tokens` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_payment_intents_event` ON `payment_intents` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_payment_intents_user` ON `payment_intents` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_payment_status_ref` ON `payment_status_events` (`reference_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user_id` ON `sessions` (`user_id`);