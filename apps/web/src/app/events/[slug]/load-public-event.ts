import "server-only";

import { cache } from "react";
import { getEventBySlug } from "@/app/actions/events";

/** One fetch per request when both `generateMetadata` and the page need the event. */
export const loadPublicEventBySlug = cache(async (slug: string) =>
  getEventBySlug(slug)
);
