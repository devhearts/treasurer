"use client";

import { useState } from "react";
import type { InviteCardContent, InviteTemplateId } from "@/lib/invitations/types";
import {
  downloadInvitePdf,
  downloadInvitePng,
  downloadInviteSvg,
} from "@/lib/invitations/export-invite-card";

interface InviteExportButtonsProps {
  templateId: InviteTemplateId;
  content: InviteCardContent;
  slug?: string;
  compact?: boolean;
}

export default function InviteExportButtons({
  templateId,
  content,
  slug = "invitation",
  compact = false,
}: InviteExportButtonsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(label: string, fn: () => void | Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch {
      setError(`Could not export ${label}.`);
    } finally {
      setBusy(null);
    }
  }

  const btn =
    "text-xs px-3 py-1.5 rounded-lg border border-muted/30 text-muted hover:border-accent hover:text-accent disabled:opacity-50";

  return (
    <div className="flex flex-col gap-2">
      <div className={`flex flex-wrap gap-2 ${compact ? "" : "justify-center"}`}>
        <button
          type="button"
          disabled={!!busy}
          className={btn}
          onClick={() => run("SVG", () => downloadInviteSvg(templateId, content, `${slug}.svg`))}
        >
          {busy === "SVG" ? "…" : "SVG"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          className={btn}
          onClick={() => run("PNG", () => downloadInvitePng(templateId, content, `${slug}.png`))}
        >
          {busy === "PNG" ? "…" : "PNG"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          className={btn}
          onClick={() => run("PDF", () => downloadInvitePdf(templateId, content, `${slug}.pdf`))}
        >
          {busy === "PDF" ? "…" : "PDF"}
        </button>
      </div>
      {error ? <p className="text-xs text-[#a32d2d] text-center">{error}</p> : null}
    </div>
  );
}
