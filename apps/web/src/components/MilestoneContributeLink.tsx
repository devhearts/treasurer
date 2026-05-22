"use client";

import { useCallback, useState } from "react";
import type { CeremonyEvent, MilestoneItem } from "@/lib/types";
import {
  absoluteMilestoneContributeUrl,
  buildMilestoneContributeShareBlurb,
  publicMilestoneContributePath,
} from "@/lib/event-share";

async function copyToClipboardSafe(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function MilestoneContributeLink({
  event,
  milestone,
}: {
  event: CeremonyEvent;
  milestone: MilestoneItem;
}) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const resolvedUrl = useCallback((): string => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}${publicMilestoneContributePath(event.slug, milestone.id)}`;
    }
    return absoluteMilestoneContributeUrl(event.slug, milestone.id);
  }, [event.slug, milestone.id]);

  async function copyLink() {
    const ok = await copyToClipboardSafe(resolvedUrl());
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function shareLink() {
    const url = resolvedUrl();
    const text = buildMilestoneContributeShareBlurb(event, milestone, url);
    const title = `${milestone.name} · ${event.title.trim() || "Contribute"}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    const ok = await copyToClipboardSafe(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        onClick={() => void copyLink()}
        className="flex-1 py-2 rounded-lg border border-accent/50 text-accent text-sm font-medium hover:bg-accent/10"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
      <button
        type="button"
        onClick={() => void shareLink()}
        className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90"
      >
        {shared ? "Shared!" : "Share"}
      </button>
    </div>
  );
}
