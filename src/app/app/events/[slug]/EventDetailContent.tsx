"use client";

import { useState } from "react";
import Link from "next/link";
import {
  formatUGX,
  getProgressPercent,
  getEventTypeLabel,
} from "@/lib/data";
import ContributeForm from "./ContributeForm";
import ContributionReceipt from "@/components/ContributionReceipt";
import RecentContributionsCard from "@/components/RecentContributionsCard";
import { CeremonyEvent } from "@/lib/types";
import {
  EventTypeIcon,
  IconBack,
  IconShare,
  IconCopy,
  IconInvite,
} from "@/components/Icons";

interface EventDetailContentProps {
  event: CeremonyEvent;
  /** When true, used on public /events/[slug]; back link and some treasurer links differ. Share/copy always use public URL. */
  isPublicView?: boolean;
}

export default function EventDetailContent({ event, isPublicView = false }: EventDetailContentProps) {
  const slug = event.slug;
  const [shareCopied, setShareCopied] = useState(false);
  // Always use public link for share/copy so recipients can view and contribute without logging in
  const publicEventUrl =
    (typeof window !== "undefined" ? window.location.origin : "") + `/events/${slug}`;

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: event.title, url: publicEventUrl });
      } catch {
        await navigator.clipboard.writeText(publicEventUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } else {
      await navigator.clipboard.writeText(publicEventUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }

  function copyEventLink() {
    navigator.clipboard.writeText(publicEventUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  const progress = getProgressPercent(event.raisedAmount, event.targetAmount);

  return (
    <main className="min-h-screen bg-light pb-24">
      <div className="max-w-lg mx-auto px-4">
        <Link
          href={isPublicView ? "/" : "/app/events"}
          className="inline-flex items-center gap-1 text-muted hover:text-surface text-sm py-4"
        >
          <IconBack className="w-4 h-4" />
          <span className="sm:hidden">Back</span>
          <span className="hidden sm:inline">{isPublicView ? "Back" : "Back to events"}</span>
        </Link>

        {/* Above fold: one key metric + one primary CTA */}
        <div className="bg-surface text-light rounded-xl p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-light/20 flex items-center justify-center text-light flex-shrink-0">
              <EventTypeIcon type={event.type} className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-light/70 text-sm">{getEventTypeLabel(event.type)}</p>
              <h1 className="text-xl font-bold truncate">{event.title}</h1>
              <p className="text-2xl font-bold text-accent mt-2">
                {formatUGX(event.raisedAmount)}
              </p>
              <p className="text-light/70 text-sm">raised of {formatUGX(event.targetAmount)}</p>
            </div>
          </div>
          <Link
            href={`#contribute`}
            className="cta-primary block text-center mt-6 text-white"
          >
            Contribute
          </Link>
        </div>

        {/* Share: single secondary action */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={copyEventLink}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-muted/30 text-muted text-sm font-medium hover:bg-muted/10"
          >
            <IconCopy className="w-4 h-4" />
            {shareCopied ? "Copied" : <><span className="sm:hidden">Copy</span><span className="hidden sm:inline">Copy link</span></>}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-muted/30 text-muted text-sm font-medium hover:bg-muted/10"
          >
            <IconShare className="w-4 h-4" />
            Share
          </button>
        </div>

        {/* Collapsible sections */}
        <details open={false} className="bg-light rounded-xl border border-muted/30 mb-4 overflow-hidden group">
          <summary className="p-4 cursor-pointer list-none font-bold text-surface">
            About
          </summary>
          <div className="px-4 pb-4 text-sm text-muted border-t border-muted/20 pt-4">
            {event.description}
          </div>
        </details>

        {event.budgetItems.length > 0 && (
          <details open={false} className="bg-light rounded-xl border border-muted/30 mb-4 overflow-hidden group">
            <summary className="p-4 cursor-pointer list-none font-bold text-surface">
              Budget
            </summary>
            <div className="px-4 pb-4 border-t border-muted/20 pt-4 space-y-2 text-sm">
              {event.budgetItems.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="text-muted">{item.name}</span>
                  <span className="text-surface font-medium">{formatUGX(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-accent pt-2">
                <span>Total</span>
                <span>{formatUGX(event.targetAmount)}</span>
              </div>
            </div>
          </details>
        )}

        <RecentContributionsCard
          contributions={event.contributions}
          eventSlug={event.slug}
          hideAllLink={isPublicView}
        />

        <ContributionReceipt
          eventTitle={event.title}
          eventDate={event.date}
          eventLocation={event.location}
          contributions={event.contributions}
          raisedAmount={event.raisedAmount}
          targetAmount={event.targetAmount}
        />

        {event.type === "wedding" && !isPublicView && (
          <div className="mt-4">
            <Link
              href={`/app/events/${event.slug}/invite`}
              className="flex items-center justify-center gap-2 p-4 rounded-xl border border-muted/30 text-surface font-medium hover:bg-muted/10"
            >
              <IconInvite className="w-5 h-5 text-accent" />
              <span className="sm:hidden">Invitations</span>
              <span className="hidden sm:inline">Invitation cards</span>
            </Link>
          </div>
        )}

        {/* Anchored primary CTA */}
        <div id="contribute" className="mt-8">
          <ContributeForm
            eventId={event.id}
            eventSlug={event.slug}
            eventTitle={event.title}
            treasurerPhone={event.treasurerPhone}
          />
        </div>
      </div>
    </main>
  );
}
