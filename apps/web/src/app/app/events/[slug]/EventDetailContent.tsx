"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  formatUGX,
  getEventTypeLabel,
  filterPublicContributions,
  hasEventTarget,
} from "@/lib/data";
import ContributeForm from "./ContributeForm";
import MilestoneItemsTab from "./MilestoneItemsTab";
import ContributionReceipt from "@/components/ContributionReceipt";
import TreasurerCashBreakdown from "@/components/TreasurerCashBreakdown";
import RecentContributionsCard from "@/components/RecentContributionsCard";
import EventPhotoGallery from "@/components/EventPhotoGallery";
import { CeremonyEvent } from "@/lib/types";
import type { PaymentProcessorKind } from "@/lib/payments/types";
import {
  EventTypeIcon,
  IconBack,
  IconShare,
  IconCopy,
  IconInvite,
} from "@/components/Icons";
import {
  buildEventShareBlurb,
  eventShareTitle,
  publicEventPath,
} from "@/lib/event-share";
import { publicStatusNotice } from "@/lib/event-lifecycle";
import EventStatusNotice from "@/components/EventStatusNotice";
import PublicEventTopChrome from "@/components/PublicEventTopChrome";
import EventLifecycleControls from "./EventLifecycleControls";

interface EventDetailContentProps {
  event: CeremonyEvent;
  /** When true, used on public /events/[slug]; back link and some treasurer links differ. Share/copy always use public URL. */
  isPublicView?: boolean;
  /** Mobile money / RequestToPay is available (server env configured). */
  momoConfigured?: boolean;
  paymentProcessorKind?: PaymentProcessorKind;
  payButtonLabel?: string;
  payerPhoneLabel?: string;
  /** Valid milestone id from `?allocateTo=` (public contribute links). */
  allocateToMilestoneId?: string;
}

type PrivateFlow = "details" | "contributions" | "milestones";

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
  paymentProcessorKind = "mtn_momo",
  payButtonLabel = "Pay with MTN Momo",
  payerPhoneLabel = "MTN Momo number (paying wallet)",
  allocateToMilestoneId,
}: EventDetailContentProps) {
  const slug = event.slug;
  const [shareCopied, setShareCopied] = useState(false);
  /** Full share message (context + link) when clipboard / share needs manual copy. */
  const [copyFallbackContent, setCopyFallbackContent] = useState<string | null>(
    null
  );
  const [privateFlow, setPrivateFlow] = useState<PrivateFlow>("details");
  const contributeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const scrollContribute = () => {
      setTimeout(
        () =>
          contributeRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        100
      );
    };
    if (allocateToMilestoneId) {
      setTimeout(() => {
        if (!isPublicView) setPrivateFlow("contributions");
        scrollContribute();
      }, 0);
      return;
    }
    if (!isPublicView && hash === "#contribute") {
      setTimeout(() => {
        setPrivateFlow("contributions");
        scrollContribute();
      }, 0);
    }
  }, [isPublicView, allocateToMilestoneId]);

  function publicEventAbsoluteUrl(): string {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${publicEventPath(slug)}`;
  }

  /** Canonical public URL for this event (browser origin, or env base in edge cases). */
  function resolvedPublicEventUrl(): string {
    const fromWindow = publicEventAbsoluteUrl();
    if (fromWindow) return fromWindow;
    const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "").trim();
    if (env) return `${env}${publicEventPath(slug)}`;
    return `http://localhost:3000${publicEventPath(slug)}`;
  }

  function shareBlurb(): string {
    return buildEventShareBlurb(event, resolvedPublicEventUrl());
  }

  async function handleShare() {
    const url = resolvedPublicEventUrl();
    const text = buildEventShareBlurb(event, url);
    const title = eventShareTitle(event);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // User cancelled share or share failed — clipboard may not work (no focus / gesture).
        const ok = await copyToClipboardSafe(text);
        if (ok) {
          setShareCopied(true);
          setTimeout(() => setShareCopied(false), 2000);
        } else {
          setCopyFallbackContent(text);
        }
        return;
      }
    }
    const ok = await copyToClipboardSafe(text);
    if (ok) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } else {
      setCopyFallbackContent(text);
    }
  }

  async function copyEventLink() {
    const text = shareBlurb();
    const ok = await copyToClipboardSafe(text);
    if (ok) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } else {
      setCopyFallbackContent(text);
    }
  }

  function goToContributions() {
    setPrivateFlow("contributions");
    setTimeout(() => contributeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  const publicContributions = filterPublicContributions(event.contributions);
  const recentContributionsForCard = isPublicView
    ? publicContributions
    : event.contributions;

  const paidCount = event.contributions.filter((c) => c.status === "paid").length;
  const pledgedCount = event.contributions.filter((c) => c.status === "pledged").length;

  const eventStatus = event.status ?? "active";
  const contributionsOpen = eventStatus === "active";
  const statusNotice = publicStatusNotice({
    status: eventStatus,
    statusMessage: event.statusMessage,
  });

  const heroInner = (
    <>
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
          <p className="text-light/70 text-sm">
            {hasEventTarget(event.targetAmount)
              ? `raised of ${formatUGX(event.targetAmount)}`
              : "raised"}
          </p>
        </div>
      </div>
      {contributionsOpen ? (
        isPublicView ? (
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
        )
      ) : isPublicView && statusNotice ? (
        <EventStatusNotice
          notice={statusNotice}
          variant="hero"
          className="mt-6 text-center"
        />
      ) : null}
    </>
  );

  const heroBlock = (
    <div className="bg-surface text-light rounded-xl p-6 mb-4">
      {heroInner}
    </div>
  );

  const galleryMergeFooter = (
    <div className="bg-surface text-light px-5 pt-4 pb-5">{heroInner}</div>
  );

  const hasEventPhotos = Boolean(event.imageUrls && event.imageUrls.length > 0);

  const eventPhotoGallery = hasEventPhotos ? (
    <EventPhotoGallery
      imageSources={event.imageUrls!}
      mergeFooter={galleryMergeFooter}
    />
  ) : null;

  const publicHeroOrGallery = hasEventPhotos ? (
    <div className="relative pt-2 mb-4">
      <PublicEventTopChrome
        onShare={() => void handleShare()}
        variant="overlay"
      />
      {eventPhotoGallery}
    </div>
  ) : (
    <div className="bg-surface text-light rounded-xl p-6 mb-4">
      <PublicEventTopChrome
        onShare={() => void handleShare()}
        variant="inline"
      />
      {heroInner}
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
        {shareCopied ? "Copied" : <><span className="sm:hidden">Copy</span><span className="hidden sm:inline">Copy to share</span></>}
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

      {hasEventTarget(event.targetAmount) && event.budgetItems.length > 0 && (
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
        key={`${event.id}-recent`}
        contributions={recentContributionsForCard}
        eventSlug={event.slug}
        hideAllLink={isPublicView}
      />

      <ContributionReceipt
        key={`${event.id}-receipt`}
        eventTitle={event.title}
        eventSlug={event.slug}
        eventDate={event.date}
        eventLocation={event.location}
        contributions={publicContributions}
        raisedAmount={event.raisedAmount}
        targetAmount={event.targetAmount}
      />

      <div id="contribute" ref={contributeRef} className="mt-8">
        {contributionsOpen ? (
          <ContributeForm
            key={`${event.id}-contribute`}
            eventId={event.id}
            eventSlug={event.slug}
            eventTitle={event.title}
            treasurerPhone={event.treasurerPhone}
            milestoneItems={event.milestoneItems}
            flow={isPublicView ? "public" : "private"}
            momoConfigured={momoConfigured}
            paymentProcessorKind={paymentProcessorKind}
            payButtonLabel={payButtonLabel}
            payerPhoneLabel={payerPhoneLabel}
            initialMilestoneId={allocateToMilestoneId ?? null}
          />
        ) : statusNotice && !isPublicView ? (
          <EventStatusNotice notice={statusNotice} />
        ) : null}
      </div>
    </>
  );

  return (
    <main className="min-h-screen bg-light pb-24">
      {copyFallbackContent && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-surface/80"
          role="dialog"
          aria-modal="true"
          aria-labelledby="copy-fallback-title"
          onClick={() => setCopyFallbackContent(null)}
        >
          <div
            className="bg-light rounded-xl border border-muted/30 shadow-lg max-w-lg w-full p-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="copy-fallback-title" className="font-bold text-surface mb-2">
              Copy to share
            </h2>
            <p className="text-sm text-muted mb-3">
              Select the text below (event details and link), or use your
              browser&apos;s share menu.
            </p>
            <textarea
              readOnly
              rows={10}
              autoFocus
              value={copyFallbackContent}
              className="w-full text-sm border border-muted/50 rounded-lg px-3 py-2 text-surface mb-3 font-sans resize-y min-h-[8rem]"
              onFocus={(e) => e.target.select()}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setCopyFallbackContent(null)}
                className="px-4 py-2 text-sm text-muted font-medium"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await copyToClipboardSafe(copyFallbackContent);
                  if (ok) {
                    setCopyFallbackContent(null);
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
        {!isPublicView ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pt-4 pb-2">
            <Link
              href="/app/events"
              className="inline-flex items-center gap-1 text-muted hover:text-surface text-sm py-2"
            >
              <IconBack className="w-4 h-4" />
              <span className="sm:hidden">Back</span>
              <span className="hidden sm:inline">Back to events</span>
            </Link>
            <Link
              href={`/app/events/${event.slug}/edit`}
              className="inline-flex items-center justify-center sm:justify-end py-2.5 px-4 rounded-xl border border-accent/35 text-accent text-sm font-bold hover:bg-accent/5 transition-colors"
            >
              Edit event
            </Link>
          </div>
        ) : null}

        {isPublicView ? publicHeroOrGallery : null}
        {!isPublicView && hasEventPhotos ? (
          <div className="pt-2 mb-4">{eventPhotoGallery}</div>
        ) : null}
        {isPublicView ? (
          <>
            {shareRow}
            {aboutBudget}
            {contributionsBlock}
          </>
        ) : (
          <>
            <div className="flex rounded-xl border border-muted/30 bg-light p-1 mb-4 gap-0.5">
              <button
                type="button"
                onClick={() => setPrivateFlow("details")}
                className={`flex-1 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                  privateFlow === "details"
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted hover:text-surface"
                }`}
              >
                <span className="sm:hidden">Details</span>
                <span className="hidden sm:inline">Event details</span>
              </button>
              <button
                type="button"
                onClick={() => setPrivateFlow("contributions")}
                className={`flex-1 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                  privateFlow === "contributions"
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted hover:text-surface"
                }`}
              >
                <span className="sm:hidden">Pay</span>
                <span className="hidden sm:inline">Contributions</span>
                <span className="ml-0.5 text-[10px] sm:text-xs font-normal opacity-90">
                  ({event.contributions.length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPrivateFlow("milestones")}
                className={`flex-1 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                  privateFlow === "milestones"
                    ? "bg-accent text-white shadow-sm"
                    : "text-muted hover:text-surface"
                }`}
              >
                <span className="sm:hidden">Goals</span>
                <span className="hidden sm:inline">Milestones</span>
              </button>
            </div>

            {privateFlow === "details" && (
              <div className="space-y-0">
                {!hasEventPhotos ? heroBlock : null}
                {shareRow}
                {aboutBudget}
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
                <p className="text-center text-sm text-muted mt-6 mb-2">
                  Use <strong className="text-surface">Milestones</strong> for sub-goals, or <strong className="text-surface">Contributions</strong> to pay and record receipts.
                </p>
              </div>
            )}

            {privateFlow === "milestones" && (
              <MilestoneItemsTab key={event.id} event={event} />
            )}

            {privateFlow === "contributions" && (
              <div className="space-y-0">
                <EventLifecycleControls event={event} />
                <TreasurerCashBreakdown
                  contributions={event.contributions}
                  raisedAmount={event.raisedAmount}
                  paidCount={paidCount}
                  pledgedCount={pledgedCount}
                  totalCount={event.contributions.length}
                />
                {contributionsBlock}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
