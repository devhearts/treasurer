CREATE TABLE `payout_method_pending` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `type` varchar(32) NOT NULL,
  `label` varchar(255) NOT NULL,
  `msisdn` varchar(32) DEFAULT NULL,
  `account_number` varchar(64) DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `branch` varchar(255) DEFAULT NULL,
  `swift` varchar(32) DEFAULT NULL,
  `is_default` tinyint NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL,
  CONSTRAINT `payout_method_pending_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_payout_method_pending_user` ON `payout_method_pending` (`user_id`);--> statement-breakpoint
CREATE TABLE `payout_method_otps` (
  `id` varchar(36) NOT NULL,
  `pending_id` varchar(36) NOT NULL,
  `code_hash` varchar(64) NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `attempts` int NOT NULL DEFAULT 0,
  `verified_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL,
  CONSTRAINT `payout_method_otps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_payout_method_otps_pending` ON `payout_method_otps` (`pending_id`);
