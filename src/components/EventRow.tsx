"use client";

import { useState } from "react";
import Link from "next/link";
import type { CeremonyEvent } from "@/lib/types";
import { formatUGX, getProgressPercent, getEventTypeLabel } from "@/lib/data";
import { EventTypeIcon } from "./Icons";

interface EventRowProps {
  event: CeremonyEvent;
}

export default function EventRow({ event }: EventRowProps) {
  const [open, setOpen] = useState(false);
  const progress = getProgressPercent(event.raisedAmount, event.targetAmount);

  return (
    <div className="bg-light rounded-xl border border-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/5 transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center text-accent flex-shrink-0">
          <EventTypeIcon type={event.type} className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-surface truncate">{event.title}</p>
          <p className="text-xs text-muted">
            {formatUGX(event.raisedAmount)} raised
            {event.targetAmount > 0 && ` · ${progress}%`}
          </p>
        </div>
        <span className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          &#9660;
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-muted/20">
          <div className="pt-4 space-y-2 text-sm text-muted">
            <p>{getEventTypeLabel(event.type)}</p>
            <p>
              {new Date(event.date).toLocaleDateString("en-UG", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              · {event.location}
            </p>
            {event.targetAmount > 0 && (
              <div className="w-full bg-muted/30 rounded-full h-1.5 mt-2">
                <div
                  className="bg-accent h-1.5 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
          <Link
            href={`/app/events/${event.slug}`}
            className="cta-primary block text-center mt-4 text-white"
          >
            Contribute
          </Link>
        </div>
      )}
    </div>
  );
}
