import Link from "next/link";
import { CeremonyEvent } from "@/lib/types";
import {
  formatUGX,
  getProgressPercent,
  getEventTypeLabel,
} from "@/lib/data";
import { EventTypeIcon, IconLocation, IconCalendar } from "./Icons";

interface EventCardProps {
  event: CeremonyEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const progress = getProgressPercent(event.raisedAmount, event.targetAmount);
  const paidCount = event.contributions.filter((c) => c.status === "paid").length;

  return (
    <Link href={`/events/${event.slug}`} className="block group">
      <div className="bg-light rounded-xl border border-muted/30 hover:border-accent/50 transition-all overflow-hidden">
        <div className="bg-surface p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-light/20 flex items-center justify-center text-light flex-shrink-0">
              <EventTypeIcon type={event.type} className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="inline-block text-light/90 text-xs font-medium mb-1">
                {getEventTypeLabel(event.type)}
              </span>
              <h3 className="text-light font-bold text-lg leading-tight truncate">
                {event.title}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3 text-light/70 text-sm mt-2">
            <span className="flex items-center gap-1">
              <IconLocation className="w-3.5 h-3.5" />
              {event.location}
            </span>
            <span className="flex items-center gap-1">
              <IconCalendar className="w-3.5 h-3.5" />
              {new Date(event.date).toLocaleDateString("en-UG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="p-5">
          <p className="text-muted text-sm line-clamp-2 mb-4">
            {event.description}
          </p>

          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-semibold text-surface">
                {formatUGX(event.raisedAmount)}
              </span>
              <span className="text-muted">
                of {formatUGX(event.targetAmount)}
              </span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>{progress}% raised</span>
              <span>{paidCount} contributors</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-muted/20">
            <span className="text-xs text-muted">
              {event.organizer}
            </span>
            <span className="text-accent text-sm font-semibold group-hover:underline">
              Contribute
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
