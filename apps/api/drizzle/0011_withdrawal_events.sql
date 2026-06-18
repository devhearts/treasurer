CREATE TABLE `withdrawal_events` (
  `withdrawal_id` varchar(36) NOT NULL,
  `event_id` varchar(36) NOT NULL,
  `created_at` datetime(3) NOT NULL,
  CONSTRAINT `withdrawal_events_withdrawal_id` PRIMARY KEY(`withdrawal_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_withdrawal_events_event` ON `withdrawal_events` (`event_id`);
