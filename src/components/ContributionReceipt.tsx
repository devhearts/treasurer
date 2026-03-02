"use client";

import { useState } from "react";
import { Contribution } from "@/lib/types";
import { IconCopy, IconReceipt } from "@/components/Icons";

interface ContributionReceiptProps {
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  contributions: Contribution[];
  raisedAmount: number;
  targetAmount: number;
}

function formatUGX(amount: number) {
  return `UGX ${amount.toLocaleString("en-UG")}`;
}

function buildReceiptText(
  eventTitle: string,
  eventDate: string,
  eventLocation: string,
  contributions: Contribution[],
  raisedAmount: number,
  targetAmount: number
): string {
  const dateStr = new Date(eventDate).toLocaleDateString("en-UG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const lines: string[] = [
    `CONTRIBUTION RECEIPT`,
    `Event: ${eventTitle}`,
    `Date: ${dateStr}`,
    `Location: ${eventLocation}`,
    ``,
    `CONTRIBUTIONS (${contributions.length}):`,
    ``,
  ];
  contributions.forEach((c, i) => {
    const name = c.anonymous ? "Anonymous" : c.name;
    const status = c.status === "paid" ? "Paid" : "Pledged";
    const manual = c.manual ? " (added by treasurer)" : "";
    lines.push(`${i + 1}. ${name} - ${formatUGX(c.amount)} - ${status}${manual}`);
  });
  lines.push(``);
  lines.push(`Total Raised: ${formatUGX(raisedAmount)}`);
  lines.push(`Target: ${formatUGX(targetAmount)}`);
  lines.push(`Progress: ${Math.min(Math.round((raisedAmount / targetAmount) * 100), 100)}%`);
  lines.push(``);
  lines.push(`CeremonyWallet`);
  return lines.join("\n");
}

export default function ContributionReceipt({
  eventTitle,
  eventDate,
  eventLocation,
  contributions,
  raisedAmount,
  targetAmount,
}: ContributionReceiptProps) {
  const [copied, setCopied] = useState(false);
  const receiptText = buildReceiptText(
    eventTitle,
    eventDate,
    eventLocation,
    contributions,
    raisedAmount,
    targetAmount
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(receiptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement("textarea");
      el.value = receiptText;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: `Receipt: ${eventTitle}`, text: receiptText }).catch(() => {});
    } else {
      handleCopy();
    }
  }

  return (
    <details className="bg-light rounded-xl border border-muted/30 mb-4 overflow-hidden group">
      <summary className="p-4 cursor-pointer list-none font-bold text-surface flex items-center justify-between">
        <span className="flex items-center gap-2">
          <IconReceipt className="w-5 h-5 text-accent" />
          Receipt
        </span>
        <span className="text-sm font-normal text-muted">{contributions.length} contributors</span>
      </summary>
      <div className="px-4 pb-4 border-t border-muted/20 pt-4">
        <div className="bg-muted/10 rounded-lg p-4 mb-4 font-mono text-xs text-surface whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto border border-muted/20">
          {receiptText}
        </div>
        <button
          onClick={handleCopy}
          className={`cta-primary mb-2 ${copied ? "opacity-90" : ""}`}
        >
          {copied ? "Copied" : <><span className="sm:hidden">Copy</span><span className="hidden sm:inline">Copy receipt</span></>}
        </button>
        <button
          onClick={handleShare}
          className="w-full py-3 rounded-lg border border-muted/30 text-muted text-sm font-medium hover:bg-muted/10"
        >
          Share
        </button>
      </div>
    </details>
  );
}
