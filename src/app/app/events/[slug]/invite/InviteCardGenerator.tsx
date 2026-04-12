"use client";

import { useState } from "react";
import { CeremonyEvent } from "@/lib/types";
import { filterPublicContributions } from "@/lib/data";
import { IconCopy } from "@/components/Icons";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-UG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildInviteText(
  guestName: string,
  event: CeremonyEvent,
  customMessage: string
): string {
  const dateStr = formatDate(event.date);
  const lines = [
    `You're Invited!`,
    ``,
    `Dear ${guestName},`,
    ``,
    `We joyfully invite you to celebrate with us at:`,
    ``,
    `${event.title}`,
    `${dateStr}`,
    `Address: ${event.location}`,
    ``,
  ];
  if (customMessage.trim()) {
    lines.push(customMessage.trim());
    lines.push(``);
  }
  lines.push(`Your support means the world to us.`);
  lines.push(``);
  lines.push(`With love,`);
  lines.push(`${event.organizer}`);
  lines.push(``);
  // Business identity block (useful when the page is "Print -> Save as PDF")
  lines.push(`Business: CeremonyWallet`);
  if (event.treasurerPhone.trim()) lines.push(`Contact: ${event.treasurerPhone}`);
  return lines.join("\n");
}

export default function InviteCardGenerator({ event }: { event: CeremonyEvent }) {
  const [customMessage, setCustomMessage] = useState(
    "Thank you for your generous contribution to our special day."
  );
  const [customName, setCustomName] = useState("");
  const [copiedFor, setCopiedFor] = useState<string | null>(null);

  const namedContributors = filterPublicContributions(
    event.contributions
  ).filter((c) => !c.anonymous);
  const inviteText = customName.trim()
    ? buildInviteText(customName.trim(), event, customMessage)
    : "";

  async function handleCopy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedFor(id);
    setTimeout(() => setCopiedFor(null), 2500);
  }

  function handleShare(text: string) {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "Wedding invitation", text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  }

  return (
    <div className="space-y-4">
        <details open className="bg-light rounded-xl border border-muted/30 overflow-hidden group">
          <summary className="p-4 cursor-pointer list-none font-bold text-surface">
            <span className="sm:hidden">Message</span>
            <span className="hidden sm:inline">Message for all</span>
          </summary>
        <div className="px-4 pb-4 border-t border-muted/20 pt-4">
          <label className="sr-only">Personal message</label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={2}
            className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-none"
            placeholder="Message in every invitation"
          />
        </div>
      </details>

      {namedContributors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-surface">Contributors</p>
          {namedContributors.map((contributor) => {
            const text = buildInviteText(contributor.name, event, customMessage);
            const isCopied = copiedFor === contributor.id;
            return (
              <div
                key={contributor.id}
                className="flex items-center justify-between gap-4 p-4 rounded-xl bg-light border border-muted/30"
              >
                <p className="font-medium text-surface truncate">{contributor.name}</p>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleCopy(contributor.id, text)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      isCopied ? "bg-accent text-white" : "border border-muted/30 text-muted hover:bg-muted/10"
                    }`}
                  >
                    {isCopied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => handleShare(text)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-accent hover:underline"
                  >
                    Share
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-light rounded-xl border border-muted/30 p-6">
        <h2 className="text-lg font-bold text-surface mb-2">
          <span className="sm:hidden">Custom</span>
          <span className="hidden sm:inline">Custom invitation</span>
        </h2>
        <label className="sr-only">Guest name</label>
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Guest name"
          className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm mb-4"
        />
        {inviteText && (
          <>
            <button
              onClick={() => handleCopy("custom", inviteText)}
              className={`cta-primary ${copiedFor === "custom" ? "opacity-90" : ""}`}
            >
              {copiedFor === "custom" ? "Copied" : <><span className="sm:hidden">Copy</span><span className="hidden sm:inline">Copy invitation</span></>}
            </button>
            <button
              type="button"
              onClick={() => handleShare(inviteText)}
              className="w-full py-3 rounded-lg border border-muted/30 text-muted text-sm font-medium mt-2 hover:bg-muted/10"
            >
              Share
            </button>
          </>
        )}
      </div>
    </div>
  );
}
