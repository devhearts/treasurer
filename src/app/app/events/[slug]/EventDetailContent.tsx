"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { formatUGX, getEventTypeLabel } from "@/lib/data";
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
  /** MTN MoMo RequestToPay is available (server env configured). */
  momoConfigured?: boolean;
}

type PrivateFlow = "details" | "contributions";

/** Clipboard API can throw NotAllowedError if document isn't focused or gesture was lost (e.g. after share sheet closes). */
async function copyToClipboardSafe(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to execCommand fallback
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function EventDetailContent({
  event,
  isPublicView = false,
  momoConfigured = false,
}: EventDetailContentProps) {
  const slug = event.slug;
  const [shareCopied, setShareCopied] = useState(false);
  const [copyFallbackUrl, setCopyFallbackUrl] = useState<string | null>(null);
  const [privateFlow, setPrivateFlow] = useState<PrivateFlow>("details");
  const contributeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || isPublicView) return;
    const hash = window.location.hash;
    if (hash === "#contribute") {
      setPrivateFlow("contributions");
      setTimeout(() => contributeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [isPublicView]);
  // Always use public link for share/copy so recipients can view and contribute without logging in
  const publicEventUrl =
    (typeof window !== "undefined" ? window.location.origin : "") + `/events/${slug}`;

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: event.title, url: publicEventUrl });
        return;
      } catch {
        // User cancelled share or share failed — clipboard may not work (no focus / gesture).
        const ok = await copyToClipboardSafe(publicEventUrl);
        if (ok) {
          setShareCopied(true);
          setTimeout(() => setShareCopied(false), 2000);
        } else {
          setCopyFallbackUrl(publicEventUrl);
        }
        return;
      }
    }
    const ok = await copyToClipboardSafe(publicEventUrl);
    if (ok) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } else {
      setCopyFallbackUrl(publicEventUrl);
    }
  }

  async function copyEventLink() {
    const ok = await copyToClipboardSafe(publicEventUrl);
    if (ok) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } else {
      setCopyFallbackUrl(publicEventUrl);
    }
  }

  function goToContributions() {
    setPrivateFlow("contributions");
    setTimeout(() => contributeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  const paidCount = event.contributions.filter((c) => c.status === "paid").length;
  const pledgedCount = event.contributions.filter((c) => c.status === "pledged").length;

  const heroBlock = (
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
      {isPublicView ? (
        <Link href={`#contribute`} className="cta-primary block text-center mt-6 text-white">
          Contribute
        </Link>
      ) : (
        <button
          type="button"
          onClick={goToContributions}
          className="cta-primary block text-center mt-6"
        >
          Contribute
        </button>
      )}
    </div>
  );

  const shareRow = (
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
  );

  const aboutBudget = (
    <>
      <details open className="bg-light rounded-xl border border-muted/30 mb-4 overflow-hidden group">
        <summary className="p-4 cursor-pointer list-none font-bold text-surface">
          About
        </summary>
        <div className="px-4 pb-4 text-sm text-muted border-t border-muted/20 pt-4">
          {event.description}
        </div>
      </details>

      {event.budgetItems.length > 0 && (
        <details open className="bg-light rounded-xl border border-muted/30 mb-4 overflow-hidden group">
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
    </>
  );

  const contributionsBlock = (
    <>
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

      <div id="contribute" ref={contributeRef} className="mt-8">
        <ContributeForm
          eventId={event.id}
          eventSlug={event.slug}
          eventTitle={event.title}
          treasurerPhone={event.treasurerPhone}
          flow={isPublicView ? "public" : "private"}
          momoConfigured={momoConfigured}
        />
      </div>
    </>
  );

  return (
    <main className="min-h-screen bg-light pb-24">
      {copyFallbackUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-surface/80"
          role="dialog"
          aria-modal="true"
          aria-labelledby="copy-fallback-title"
          onClick={() => setCopyFallbackUrl(null)}
        >
          <div
            className="bg-light rounded-xl border border-muted/30 shadow-lg max-w-lg w-full p-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="copy-fallback-title" className="font-bold text-surface mb-2">
              Copy link
            </h2>
            <p className="text-sm text-muted mb-3">
              Select and copy the link below, or use your browser&apos;s share menu.
            </p>
            <input
              type="text"
              readOnly
              autoFocus
              value={copyFallbackUrl}
              className="w-full text-sm font-mono border border-muted/50 rounded-lg px-3 py-2 text-surface mb-3"
              onFocus={(e) => e.target.select()}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setCopyFallbackUrl(null)}
                className="px-4 py-2 text-sm text-muted font-medium"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await copyToClipboardSafe(copyFallbackUrl);
                  if (ok) {
                    setCopyFallbackUrl(null);
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2000);
                  }
                }}
                className="px-4 py-2 text-sm bg-accent text-white font-semibold rounded-lg"
              >
                Try copy again
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-lg mx-auto px-4">
        <Link
          href={isPublicView ? "/" : "/app/events"}
          className="inline-flex items-center gap-1 text-muted hover:text-surface text-sm py-4"
        >
          <IconBack className="w-4 h-4" />
          <span className="sm:hidden">Back</span>
          <span className="hidden sm:inline">{isPublicView ? "Back" : "Back to events"}</span>
        </Link>

        {isPublicView ? (
          <>
            {heroBlock}
            {shareRow}
            {aboutBudget}
            {contributionsBlock}
          </>
        ) : (
          <>
            <div className="flex rounded-xl border border-muted/30 bg-light p-1 mb-4">
              <button
                type="button"
                onClick={() => setPrivateFlow("details")}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors ${
                  privateFlow === "details"
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted hover:text-surface"
                }`}
              >
                Event details
              </button>
              <button
                type="button"
                onClick={() => setPrivateFlow("contributions")}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors ${
                  privateFlow === "contributions"
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted hover:text-surface"
                }`}
              >
                Contributions
                <span className="ml-1 text-xs font-normal opacity-90">
                  ({event.contributions.length})
                </span>
              </button>
            </div>

            {privateFlow === "details" && (
              <div className="space-y-0">
                {heroBlock}
                {shareRow}
                {aboutBudget}
                {event.type === "wedding" && (
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
                <p className="text-center text-sm text-muted mt-6 mb-2">
                  Switch to <strong className="text-surface">Contributions</strong> to record payments, receipts, and new contributions.
                </p>
              </div>
            )}

            {privateFlow === "contributions" && (
              <div className="space-y-0">
                <div className="bg-light rounded-xl border border-muted/30 p-4 mb-4">
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">Summary</p>
                  <p className="text-lg font-bold text-surface">{formatUGX(event.raisedAmount)}</p>
                  <p className="text-sm text-muted">
                    {paidCount} paid · {pledgedCount} pledged · {event.contributions.length} total
                  </p>
                </div>
                {contributionsBlock}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
