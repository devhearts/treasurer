"use client";

import Link from "next/link";
import type { CeremonyEvent } from "@/lib/types";
import { formatUGX, getEventTypeLabel } from "@/lib/data";
import { firstEventImageSrc } from "@/lib/event-share";
import {
  eventStatusLabel,
  groupEventsByTreasurerSection,
} from "@/lib/event-lifecycle";
import TreasurerEventSections from "@/components/TreasurerEventSections";
import { EventTypeIcon } from "./Icons";

interface HomeEventsListProps {
  events: CeremonyEvent[];
  /** Cap how many active events appear in the home preview. */
  activeLimit?: number;
}

function HomeEventRow({ event }: { event: CeremonyEvent }) {
  const thumbSrc = firstEventImageSrc(event);
  const status = event.status ?? "active";
  const trailingLabel =
    status === "active" ? "Open" : eventStatusLabel(status);

  return (
    <Link
      href={`/app/events/${event.slug}`}
      className="flex items-center gap-4 p-4 rounded-xl bg-light border border-muted/30 hover:border-accent/50 transition-colors"
    >
      {thumbSrc ? (
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted/30 flex-shrink-0 ring-1 ring-muted/25">
          {/* eslint-disable-next-line @next/next/no-img-element -- API gallery URL */}
          <img
            src={thumbSrc}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center text-accent flex-shrink-0">
          <EventTypeIcon type={event.type} className="w-5 h-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-surface truncate">{event.title}</p>
        <p className="text-xs text-muted">
          {getEventTypeLabel(event.type, event.typeLabel)} · {formatUGX(event.raisedAmount)} raised
        </p>
      </div>
      <span
        className={`text-sm font-medium flex-shrink-0 ${
          status === "active" ? "text-accent" : "text-muted"
        }`}
      >
        {trailingLabel}
      </span>
    </Link>
  );
}

export default function HomeEventsList({
  events,
  activeLimit,
}: HomeEventsListProps) {
  const groups = groupEventsByTreasurerSection(events);
  const previewGroups = {
    ...groups,
    active:
      activeLimit != null
        ? groups.active.slice(0, activeLimit)
        : groups.active,
  };

  return (
    <TreasurerEventSections
      groups={previewGroups}
      listClassName="space-y-2"
      renderEvent={(event) => <HomeEventRow key={event.id} event={event} />}
    />
  );
}
