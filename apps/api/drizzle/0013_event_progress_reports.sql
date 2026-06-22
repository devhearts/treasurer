CREATE TABLE `event_progress_reports` (
  `id` varchar(36) NOT NULL,
  `event_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `status` varchar(16) NOT NULL,
  `storage_key` varchar(512),
  `error_message` text,
  `created_at` datetime(3) NOT NULL,
  `completed_at` datetime(3),
  CONSTRAINT `event_progress_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_event_progress_reports_event_created` ON `event_progress_reports` (`event_id`, `created_at`);
