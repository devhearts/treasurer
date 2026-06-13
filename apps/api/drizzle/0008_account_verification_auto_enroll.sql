-- Auto-enroll email-verified users who are not yet in account verification (or were rejected).
INSERT INTO `account_verifications` (`user_id`, `status`, `created_at`, `updated_at`, `reviewed_by`)
SELECT
  u.`id`,
  'enrolled',
  UTC_TIMESTAMP(3),
  UTC_TIMESTAMP(3),
  'migration:auto_enroll'
FROM `users` u
LEFT JOIN `account_verifications` av ON av.`user_id` = u.`id`
WHERE u.`email_verified_at` IS NOT NULL
  AND av.`user_id` IS NULL;
--> statement-breakpoint
UPDATE `account_verifications` av
INNER JOIN `users` u ON u.`id` = av.`user_id`
SET
  av.`status` = 'enrolled',
  av.`rejection_reason` = NULL,
  av.`updated_at` = UTC_TIMESTAMP(3),
  av.`reviewed_by` = 'migration:auto_enroll'
WHERE u.`email_verified_at` IS NOT NULL
  AND av.`status` IN ('none', 'rejected');
