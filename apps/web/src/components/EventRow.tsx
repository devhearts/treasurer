"use client";

import { useState } from "react";
import Link from "next/link";
import type { CeremonyEvent } from "@/lib/types";
import {
  formatUGX,
  getProgressPercent,
  getEventTypeLabel,
  hasEventTarget,
} from "@/lib/data";
import { firstEventImageSrc } from "@/lib/event-share";
import {
  eventStatusBadgeClass,
  eventStatusLabel,
} from "@/lib/event-lifecycle";
import { EventTypeIcon, IconPaid, IconPledge, IconPhone, IconLocation, IconCalendar } from "./Icons";

interface EventRowProps {
  event: CeremonyEvent;
}

export default function EventRow({ event }: EventRowProps) {
  const [open, setOpen] = useState(true);
  const progress = getProgressPercent(event.raisedAmount, event.targetAmount);
  const paidCount = event.contributions.filter((c) => c.status === "paid").length;
  const pledgedCount = event.contributions.filter((c) => c.status === "pledged").length;
  const thumbSrc = firstEventImageSrc(event);
  const status = event.status ?? "active";

  return (
    <div className="bg-light rounded-xl border border-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/5 transition-colors"
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
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-semibold text-surface truncate">{event.title}</p>
            {status !== "active" ? (
              <span
                className={`inline-flex flex-shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${eventStatusBadgeClass(status)}`}
              >
                {eventStatusLabel(status)}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted">
            {hasEventTarget(event.targetAmount)
              ? `${formatUGX(event.raisedAmount)} raised · ${progress}%`
              : `${formatUGX(event.raisedAmount)} raised`}
          </p>
        </div>
        <span className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          &#9660;
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-muted/20">
          <div className="pt-4 space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-surface uppercase tracking-wide mb-1">About</p>
              <p className="text-muted leading-relaxed">{event.description}</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted">
              <span className="flex items-center gap-1">
                <IconCalendar className="w-3.5 h-3.5 flex-shrink-0" />
                {new Date(event.date).toLocaleDateString("en-UG", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1 min-w-0">
                <IconLocation className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </span>
            </div>
            <div className="text-muted">
              <span className="text-surface font-medium">{getEventTypeLabel(event.type)}</span>
              <span className="mx-2">·</span>
              <span>Organizer: {event.organizer}</span>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <IconPhone className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-mono text-surface text-xs">{event.treasurerPhone}</span>
              <span className="text-xs">(Mobile Money)</span>
            </div>
            <div className="rounded-lg bg-muted/10 border border-muted/20 p-3">
              <p className="text-xs font-semibold text-surface mb-2">Contributions</p>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted">Raised</span>
                <span className="font-semibold text-surface">
                  {formatUGX(event.raisedAmount)}
                </span>
              </div>
              {hasEventTarget(event.targetAmount) && (
                <>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted">Target</span>
                    <span className="text-surface">
                      {formatUGX(event.targetAmount)}
                    </span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-1.5 mb-2">
                    <div
                      className="bg-accent h-1.5 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <IconPaid className="w-3.5 h-3.5 text-accent" aria-hidden />
                  {paidCount} paid
                </span>
                <span className="inline-flex items-center gap-1">
                  <IconPledge className="w-3.5 h-3.5" aria-hidden />
                  {pledgedCount} pledged
                </span>
                <span>{event.contributions.length} total</span>
              </div>
            </div>
          </div>
          <Link
            href={`/app/events/${event.slug}`}
            className="cta-primary block text-center mt-4 text-white"
          >
            Open event
          </Link>
        </div>
      )}
    </div>
  );
}
