-- Idempotent: `phone` may already exist after `drizzle-kit push` or a replayed migrate.
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `phone` varchar(32) NULL;
