"use client";

import { useState } from "react";
import { Contribution, MilestoneItem } from "@/lib/types";
import { formatCalendarDate, formatUGX, getProgressPercent } from "@/lib/data";
import { absolutePublicEventUrl } from "@/lib/event-share";
import { IconCopy, IconReceipt } from "@/components/Icons";

interface ContributionReceiptProps {
  eventTitle: string;
  eventSlug: string;
  eventDate: string;
  eventLocation: string;
  contributions: Contribution[];
  raisedAmount: number;
  targetAmount: number;
  milestoneItems?: MilestoneItem[];
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

function appendMilestoneSummary(
  lines: string[],
  milestoneItems: MilestoneItem[]
): void {
  if (milestoneItems.length === 0) return;
  lines.push(`MILESTONE SUMMARY:`);
  milestoneItems.forEach((m, i) => {
    const pct = getProgressPercent(m.raisedAmount, m.targetAmount);
    lines.push(
      `${i + 1}. ${m.name}: ${formatUGX(m.raisedAmount)} of ${formatUGX(m.targetAmount)} (${pct}%)`
    );
  });
  lines.push(``);
}

function buildReceiptText(
  eventTitle: string,
  eventSlug: string,
  eventDate: string,
  eventLocation: string,
  contributions: Contribution[],
  raisedAmount: number,
  targetAmount: number,
  milestoneItems: MilestoneItem[] = []
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
    `Contribute online:`,
    absolutePublicEventUrl(eventSlug),
    ``,
    `CONTRIBUTIONS (${contributions.length}):`,
    ``,
  ];

  appendContributionSection(lines, `Cash Contributions:`, paid);
  appendContributionSection(lines, `Pledged Contributions:`, pledged);
  appendMilestoneSummary(lines, milestoneItems);
  lines.push(`Total Cash Raised: ${formatUGX(raisedAmount)}`);
  if (targetAmount > 0) {
    lines.push(`Target: ${formatUGX(targetAmount)}`);
    lines.push(`Progress: ${progressPct}%`);
    lines.push(``);
  }
  return lines.join("\n");
}

export default function ContributionReceipt({
  eventTitle,
  eventSlug,
  eventDate,
  eventLocation,
  contributions,
  raisedAmount,
  targetAmount,
  milestoneItems = [],
}: ContributionReceiptProps) {
  const [copied, setCopied] = useState(false);
  const receiptText = buildReceiptText(
    eventTitle,
    eventSlug,
    eventDate,
    eventLocation,
    contributions,
    raisedAmount,
    targetAmount,
    milestoneItems
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
