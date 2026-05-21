CREATE TABLE `user_wallets` (
  `user_id` varchar(36) NOT NULL,
  `balance` int NOT NULL DEFAULT 0,
  `total_in` int NOT NULL DEFAULT 0,
  `total_out` int NOT NULL DEFAULT 0,
  `currency` varchar(8) NOT NULL DEFAULT 'UGX',
  `updated_at` datetime(3) NOT NULL,
  CONSTRAINT `user_wallets_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `direction` varchar(8) NOT NULL,
  `kind` varchar(32) NOT NULL,
  `amount` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `badge` varchar(64),
  `event_id` varchar(36),
  `contribution_id` varchar(36),
  `withdrawal_id` varchar(36),
  `created_at` datetime(3) NOT NULL,
  CONSTRAINT `wallet_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payout_methods` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `type` varchar(32) NOT NULL,
  `label` varchar(255) NOT NULL,
  `msisdn` varchar(32),
  `account_number` varchar(64),
  `bank_name` varchar(255),
  `branch` varchar(255),
  `swift` varchar(32),
  `is_default` tinyint NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL,
  CONSTRAINT `payout_methods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `withdrawals` (
  `id` varchar(36) NOT NULL,
  `reference` varchar(64) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `method_id` varchar(36) NOT NULL,
  `gross_amount` int NOT NULL,
  `momo_fee` int NOT NULL,
  `platform_fee` int NOT NULL,
  `net_amount` int NOT NULL,
  `status` varchar(32) NOT NULL,
  `failure_reason` varchar(512),
  `processor_ref` varchar(64),
  `idempotency_key` varchar(64),
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  CONSTRAINT `withdrawals_id` PRIMARY KEY(`id`),
  CONSTRAINT `withdrawals_reference` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `withdrawal_otps` (
  `id` varchar(36) NOT NULL,
  `withdrawal_id` varchar(36) NOT NULL,
  `code_hash` varchar(64) NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `attempts` int NOT NULL DEFAULT 0,
  `verified_at` datetime(3),
  `created_at` datetime(3) NOT NULL,
  CONSTRAINT `withdrawal_otps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_user_wallets_updated` ON `user_wallets` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_wallet_tx_user_created` ON `wallet_transactions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_wallet_tx_contribution` ON `wallet_transactions` (`contribution_id`);--> statement-breakpoint
CREATE INDEX `idx_payout_methods_user` ON `payout_methods` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_withdrawals_user` ON `withdrawals` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_withdrawals_idempotency` ON `withdrawals` (`user_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_withdrawal_otps_withdrawal` ON `withdrawal_otps` (`withdrawal_id`);
