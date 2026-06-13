"use client";

import Link from "next/link";
import { useState } from "react";
import type { AccountVerificationStatus } from "@/lib/verification/types";

interface VerificationBannerProps {
  status: AccountVerificationStatus;
  rejectionReason?: string | null;
}

export default function VerificationBanner({
  status,
  rejectionReason,
}: VerificationBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || status === "verified") return null;

  let message: React.ReactNode;
  let cta: React.ReactNode = null;

  switch (status) {
    case "none":
    case "enrolled":
      message = "Verify your account to enable withdrawals.";
      cta = (
        <Link href="/app/verify-account" className="underline font-medium">
          Verify my account
        </Link>
      );
      break;
    case "pending_review":
      message = "Your verification is under review.";
      cta = (
        <Link href="/app/verify-account" className="underline font-medium">
          View status
        </Link>
      );
      break;
    case "rejected":
      message = "Your verification was rejected. Review the reason and submit again.";
      cta = (
        <Link href="/app/verify-account" className="underline font-medium">
          View status
        </Link>
      );
      break;
    default:
      return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200/80 text-amber-950">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-start justify-between gap-3 text-sm">
        <p>
          {message} {cta}
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-amber-800/70 hover:text-amber-950 shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
