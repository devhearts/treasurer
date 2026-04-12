"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { formatUGX, formatCalendarDate } from "@/lib/data";
import type { Contribution } from "@/lib/types";
import { IconPaid, IconPledge } from "@/components/Icons";

const ROTATE_MS = 4000;
const CHUNK_SIZE = 2;

interface RecentContributionsCardProps {
  contributions: Contribution[];
  eventSlug: string;
  /** When true, hide "See all contributions" link (e.g. on public event view). */
  hideAllLink?: boolean;
}

/** Chunk array into groups of size n. */
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) {
    out.push(arr.slice(i, i + n));
  }
  return out;
}

export default function RecentContributionsCard({
  contributions,
  eventSlug,
  hideAllLink = false,
}: RecentContributionsCardProps) {
  const chunks = useMemo(() => {
    const recent = [...contributions].reverse();
    return chunk(recent, CHUNK_SIZE);
  }, [contributions]);

  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (chunks.length <= 1) return;
    const t = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % chunks.length);
        setIsVisible(true);
      }, 300);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [chunks.length]);

  if (contributions.length === 0) {
    return (
      <div className="bg-light rounded-xl border border-muted/30 mb-4 overflow-hidden">
        <div className="p-4">
          <h3 className="font-bold text-surface mb-2">Recent contributions</h3>
          <p className="text-muted text-sm">No contributions yet.</p>
          {!hideAllLink && (
            <Link
              href={`/app/events/${eventSlug}/contributions`}
              className="mt-3 inline-block text-sm text-accent font-medium hover:underline"
            >
              See all contributions
            </Link>
          )}
        </div>
      </div>
    );
  }

  const current = chunks[index] ?? chunks[0];

  return (
    <div className="bg-light rounded-xl border border-muted/30 mb-4 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-surface">Recent contributions</h3>
          <span className="text-sm text-muted">{contributions.length} so far</span>
        </div>
        <div
          className="min-h-[3.5rem] flex flex-col justify-center transition-all duration-300 ease-out"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(6px)",
          }}
        >
          {current.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 py-1"
            >
              <span className="font-medium text-surface text-sm flex items-center gap-2 min-w-0">
                {c.status === "paid" ? (
                  <IconPaid className="w-4 h-4 flex-shrink-0 text-accent" aria-label="Paid" />
                ) : (
                  <IconPledge className="w-4 h-4 flex-shrink-0 text-muted" aria-label="Pledged" />
                )}
                <span className="truncate">{c.anonymous ? "Anonymous" : c.name}</span>
              </span>
              <span className="text-sm text-muted flex-shrink-0 text-right">
                <span className="block">{formatUGX(c.amount)}</span>
                {c.status === "pledged" && c.pledgeHopeBy?.trim() && (
                  <span className="block text-[11px] font-normal opacity-90">
                    hope to pay {formatCalendarDate(c.pledgeHopeBy)}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
        {!hideAllLink && (
          <Link
            href={`/app/events/${eventSlug}/contributions`}
            className="mt-3 inline-block text-sm text-accent font-medium hover:underline"
          >
            See all contributions
          </Link>
        )}
      </div>
    </div>
  );
}
