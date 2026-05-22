CREATE TABLE `invitations` (
  `id` varchar(36) NOT NULL,
  `event_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `template_id` varchar(32) NOT NULL,
  `content_json` json NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'draft',
  `published_at` datetime(3) DEFAULT NULL,
  `recipient_count` int NOT NULL DEFAULT 0,
  `open_count` int NOT NULL DEFAULT 0,
  `rsvp_yes_count` int NOT NULL DEFAULT 0,
  `rsvp_no_count` int NOT NULL DEFAULT 0,
  `rsvp_maybe_count` int NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  CONSTRAINT `invitations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_invitations_event` ON `invitations` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_invitations_user` ON `invitations` (`user_id`);--> statement-breakpoint
CREATE TABLE `invitation_recipients` (
  `id` varchar(36) NOT NULL,
  `invitation_id` varchar(36) NOT NULL,
  `guest_name` varchar(255) NOT NULL,
  `contact` varchar(255) DEFAULT NULL,
  `view_token` varchar(64) NOT NULL,
  `opened_at` datetime(3) DEFAULT NULL,
  `rsvp_status` varchar(16) NOT NULL DEFAULT 'pending',
  `rsvp_at` datetime(3) DEFAULT NULL,
  `rsvp_party_size` int DEFAULT NULL,
  `rsvp_message` varchar(500) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL,
  CONSTRAINT `invitation_recipients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_invitation_recipients_invitation` ON `invitation_recipients` (`invitation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_invitation_recipients_token` ON `invitation_recipients` (`view_token`);
