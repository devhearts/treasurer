ALTER TABLE `events` ADD COLUMN `status` varchar(16) NOT NULL DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE `events` ADD COLUMN `status_message` text;
--> statement-breakpoint
ALTER TABLE `events` ADD COLUMN `pre_suspend_status` varchar(16);
--> statement-breakpoint
ALTER TABLE `events` ADD COLUMN `suspend_reason` varchar(500);
--> statement-breakpoint
ALTER TABLE `events` ADD COLUMN `status_changed_at` varchar(32);
--> statement-breakpoint
CREATE INDEX `idx_events_status` ON `events` (`status`);
