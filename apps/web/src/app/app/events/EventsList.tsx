"use client";

import { useState } from "react";
import EventRow from "@/components/EventRow";
import Link from "next/link";
import TreasurerEventSections from "@/components/TreasurerEventSections";
import { EventTypeIcon } from "@/components/Icons";
import { groupEventsByTreasurerSection } from "@/lib/event-lifecycle";
import type { CeremonyEvent } from "@/lib/types";
import type { EventType } from "@/lib/types";

type FilterValue = "all" | EventType;

interface EventsListProps {
  events: CeremonyEvent[];
  tabs: { value: FilterValue; label: string; type?: EventType }[];
}

export default function EventsList({ events, tabs }: EventsListProps) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const filtered =
    filter === "all" ? events : events.filter((e) => e.type === filter);
  const groups = groupEventsByTreasurerSection(filtered);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              filter === tab.value
                ? "bg-accent text-white border-accent"
                : "bg-light text-muted border-muted/30 hover:border-muted"
            }`}
          >
            {tab.type && <EventTypeIcon type={tab.type} className="w-4 h-4" />}
            {tab.label}
          </button>
        ))}
      </div>

      <TreasurerEventSections
        groups={groups}
        renderEvent={(event) => <EventRow key={event.id} event={event} />}
        emptyState={
          <div className="text-center py-12">
            <p className="text-muted mb-4">No events match.</p>
            <Link
              href="/app/create"
              className="cta-primary inline-block text-center max-w-xs mx-auto"
            >
              <span className="sm:hidden">Create</span>
              <span className="hidden sm:inline">Create event</span>
            </Link>
          </div>
        }
      />
    </div>
  );
}
