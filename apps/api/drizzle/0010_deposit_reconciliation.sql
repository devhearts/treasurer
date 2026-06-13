CREATE TABLE `reconciled_payment_intents` (
  `reference_id` varchar(36) NOT NULL,
  `outcome` varchar(32) NOT NULL,
  `kind` varchar(32) NOT NULL,
  `processor` varchar(32) NOT NULL,
  `provider_status` varchar(32) NOT NULL,
  `failure_code` varchar(64),
  `failure_message` text,
  `provider_payload` json,
  `reconciled_at` datetime(3) NOT NULL,
  CONSTRAINT `reconciled_payment_intents_reference_id` PRIMARY KEY(`reference_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_reconciled_payment_intents_reconciled_at` ON `reconciled_payment_intents` (`reconciled_at`);
