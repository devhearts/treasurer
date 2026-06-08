-- Event poster images (JSON array of URL strings, max 3 on write path).
ALTER TABLE `events` ADD COLUMN IF NOT EXISTS `image_urls` json NULL;
