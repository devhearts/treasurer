ALTER TABLE `users` ADD `account_verified_at` datetime(3);
--> statement-breakpoint
CREATE TABLE `account_verifications` (
  `user_id` varchar(36) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'none',
  `legal_name` varchar(255),
  `phone_msisdn` varchar(32),
  `selfie_key` varchar(512),
  `id_front_key` varchar(512),
  `id_back_key` varchar(512),
  `rejection_reason` text,
  `submitted_at` datetime(3),
  `reviewed_at` datetime(3),
  `reviewed_by` varchar(255),
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  CONSTRAINT `account_verifications_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `verification_capture_sessions` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `selfie_key` varchar(512),
  `id_front_key` varchar(512),
  `id_back_key` varchar(512),
  `consumed_at` datetime(3),
  `created_at` datetime(3) NOT NULL,
  CONSTRAINT `verification_capture_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_verification_capture_token` ON `verification_capture_sessions` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `idx_verification_capture_user` ON `verification_capture_sessions` (`user_id`);
