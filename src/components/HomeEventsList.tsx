import Link from "next/link";
import type { CeremonyEvent } from "@/lib/types";
import { formatUGX, getEventTypeLabel } from "@/lib/data";
import { EventTypeIcon } from "./Icons";

interface HomeEventsListProps {
  events: CeremonyEvent[];
}

export default function HomeEventsList({ events }: HomeEventsListProps) {
  return (
    <ul className="space-y-2">
      {events.map((event) => (
          <li key={event.id}>
            <Link
              href={`/app/events/${event.slug}`}
              className="flex items-center gap-4 p-4 rounded-xl bg-light border border-muted/30 hover:border-accent/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center text-accent flex-shrink-0">
                <EventTypeIcon type={event.type} className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-surface truncate">{event.title}</p>
                <p className="text-xs text-muted">
                  {getEventTypeLabel(event.type)} · {formatUGX(event.raisedAmount)} raised
                </p>
              </div>
              <span className="text-accent text-sm font-medium flex-shrink-0">Contribute</span>
            </Link>
          </li>
      ))}
    </ul>
  );
}
