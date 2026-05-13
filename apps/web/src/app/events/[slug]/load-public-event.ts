import "server-only";

import { getEventBySlug } from "@/app/actions/events";

/**
 * Loads the public event by slug for `/events/[slug]` (page + `generateMetadata`).
 *
 * Intentionally **not** wrapped in `react` `cache()`: deduplication caused incorrect
 * cross-event reuse in some deployments (wrong OG / preview image for a different slug).
 */
export async function loadPublicEventBySlug(slug: string) {
  return getEventBySlug(slug);
}
