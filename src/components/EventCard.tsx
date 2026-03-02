import Link from "next/link";
import { CeremonyEvent } from "@/lib/types";
import {
  formatUGX,
  getProgressPercent,
  getEventTypeLabel,
  getEventTypeEmoji,
} from "@/lib/data";

interface EventCardProps {
  event: CeremonyEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const progress = getProgressPercent(event.raisedAmount, event.targetAmount);
  const paidContributions = event.contributions.filter(
    (c) => c.status === "paid"
  ).length;

  return (
    <Link href={`/events/${event.slug}`} className="block group">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group-hover:-translate-y-0.5">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-medium px-2.5 py-1 rounded-full mb-2">
                {getEventTypeEmoji(event.type)} {getEventTypeLabel(event.type)}
              </span>
              <h3 className="text-white font-bold text-lg leading-tight">
                {event.title}
              </h3>
            </div>
          </div>
          <p className="text-purple-200 text-sm mt-1">
            📍 {event.location} &nbsp;·&nbsp; 📅{" "}
            {new Date(event.date).toLocaleDateString("en-UG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-gray-500 text-sm line-clamp-2 mb-4">
            {event.description}
          </p>

          {/* Progress */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-semibold text-gray-800">
                {formatUGX(event.raisedAmount)}
              </span>
              <span className="text-gray-400">
                of {formatUGX(event.targetAmount)}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-orange-400 to-orange-500 h-2.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{progress}% raised</span>
              <span>{paidContributions} contributors</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
            <span className="text-xs text-gray-400">
              Organized by {event.organizer}
            </span>
            <span className="text-purple-700 text-sm font-semibold group-hover:text-orange-500 transition-colors">
              Contribute →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
