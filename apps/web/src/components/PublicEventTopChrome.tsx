"use client";

import { useState } from "react";
import Link from "next/link";
import { IconShare, IconWallet } from "@/components/Icons";

const FLOATING_BTN_CLASS =
  "pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/30 text-white shadow-sm backdrop-blur-md transition-colors hover:bg-white/40 active:bg-white/45";

interface PublicEventTopChromeProps {
  onShare: () => void;
  /** `overlay` — absolute on photo gallery; `inline` — in-flow row inside the hero card. */
  variant?: "overlay" | "inline";
}

function MarketingModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-surface/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cw-marketing-title"
      onClick={onClose}
    >
      <div
        className="bg-light rounded-xl border border-muted/30 shadow-lg max-w-sm w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <IconWallet className="w-5 h-5" aria-hidden />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            CeremonyWallet
          </p>
        </div>
        <h2
          id="cw-marketing-title"
          className="text-lg font-bold text-surface leading-snug mb-2"
        >
          The transparent treasurer for every ceremony
        </h2>
        <p className="text-sm text-muted leading-relaxed mb-5">
          Register on CeremonyWallet to create your event, share a link, and
          track contributions in real time—all in one place.
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-muted font-medium rounded-lg hover:bg-muted/10"
          >
            Cancel
          </button>
          <Link
            href="/"
            className="cta-primary text-center text-sm py-2.5 px-4"
            onClick={onClose}
          >
            Get started on CeremonyWallet
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PublicEventTopChrome({
  onShare,
  variant = "overlay",
}: PublicEventTopChromeProps) {
  const [marketingOpen, setMarketingOpen] = useState(false);

  const buttons = (
    <>
      <button
        type="button"
        onClick={() => setMarketingOpen(true)}
        className={FLOATING_BTN_CLASS}
        aria-label="About CeremonyWallet"
      >
        <IconWallet className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onShare}
        className={FLOATING_BTN_CLASS}
        aria-label="Share event"
      >
        <IconShare className="h-4 w-4" />
      </button>
    </>
  );

  return (
    <>
      {variant === "inline" ? (
        <div className="flex items-center justify-between mb-4">{buttons}</div>
      ) : (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-between p-3">
          {buttons}
        </div>
      )}
      {marketingOpen ? (
        <MarketingModal onClose={() => setMarketingOpen(false)} />
      ) : null}
    </>
  );
}
