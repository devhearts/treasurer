"use client";

import { useState } from "react";
import { Contribution } from "@/lib/types";
import { formatCalendarDate, formatUGX } from "@/lib/data";
import { IconCopy, IconReceipt } from "@/components/Icons";

interface ContributionReceiptProps {
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  /** Mobile Money number to contact/receive contributions for this event. */
  treasurerPhone: string;
  contributions: Contribution[];
  raisedAmount: number;
  targetAmount: number;
}

function formatContributionLine(c: Contribution, index: number): string {
  const name = c.anonymous ? "Anonymous" : c.name;
  const status = c.status === "paid" ? "Paid" : "Pledged";
  const manual = c.manual ? " (added by treasurer)" : "";
  const hope =
    c.status === "pledged" && c.pledgeHopeBy?.trim()
      ? ` — hope to pay by ${formatCalendarDate(c.pledgeHopeBy, "long")}`
      : "";
  return `${index}. ${name} - ${formatUGX(c.amount)} - ${status}${manual}${hope}`;
}

function appendContributionSection(
  lines: string[],
  heading: string,
  items: Contribution[]
): void {
  if (items.length === 0) return;
  lines.push(heading);
  items.forEach((c, i) => lines.push(formatContributionLine(c, i + 1)));
  lines.push(``);
}

function buildReceiptText(
  eventTitle: string,
  eventDate: string,
  eventLocation: string,
  treasurerPhone: string,
  contributions: Contribution[],
  raisedAmount: number,
  targetAmount: number
): string {
  const dateStr = new Date(eventDate).toLocaleDateString("en-UG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const paid = contributions.filter((c) => c.status === "paid");
  const pledged = contributions.filter((c) => c.status === "pledged");
  const progressPct =
    targetAmount > 0
      ? Math.min(Math.round((raisedAmount / targetAmount) * 100), 100)
      : 0;

  const lines: string[] = [
    `CONTRIBUTION RECEIPT`,
    `Event: ${eventTitle}`,
    `Date: ${dateStr}`,
    `Address: ${eventLocation}`,
    ``,
    `CONTRIBUTIONS (${contributions.length}):`,
    ``,
  ];

  appendContributionSection(lines, `Cash Contributions:`, paid);
  appendContributionSection(lines, `Pledged Contributions:`, pledged);
  lines.push(`Total Cash Raised: ${formatUGX(raisedAmount)}`);
  if (targetAmount > 0) {
    lines.push(`Target: ${formatUGX(targetAmount)}`);
    lines.push(`Progress: ${progressPct}%`);
    lines.push(``);
  }
  lines.push(`Business: CeremonyWallet`);
  if (treasurerPhone.trim()) lines.push(`Contact: ${treasurerPhone}`);
  return lines.join("\n");
}

export default function ContributionReceipt({
  eventTitle,
  eventDate,
  eventLocation,
  treasurerPhone,
  contributions,
  raisedAmount,
  targetAmount,
}: ContributionReceiptProps) {
  const [copied, setCopied] = useState(false);
  const receiptText = buildReceiptText(
    eventTitle,
    eventDate,
    eventLocation,
    treasurerPhone,
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
    <details open={false} className="bg-light rounded-xl border border-muted/30 mb-4 overflow-hidden group">
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
