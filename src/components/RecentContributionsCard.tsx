"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { formatUGX } from "@/lib/data";
import type { Contribution } from "@/lib/types";

const ROTATE_MS = 4000;
const CHUNK_SIZE = 2;

interface RecentContributionsCardProps {
  contributions: Contribution[];
  eventSlug: string;
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
          <Link
            href={`/events/${eventSlug}/contributions`}
            className="mt-3 inline-block text-sm text-accent font-medium hover:underline"
          >
            See all contributions
          </Link>
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
              className="flex items-center justify-between py-1"
            >
              <span className="font-medium text-surface text-sm">
                {c.anonymous ? "Anonymous" : c.name}
              </span>
              <span className="text-sm text-muted">{formatUGX(c.amount)}</span>
            </div>
          ))}
        </div>
        <Link
          href={`/events/${eventSlug}/contributions`}
          className="mt-3 inline-block text-sm text-accent font-medium hover:underline"
        >
          See all contributions
        </Link>
      </div>
    </div>
  );
}
