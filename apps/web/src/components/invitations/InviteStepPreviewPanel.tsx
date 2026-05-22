"use client";

import { useState } from "react";
import InviteCardPreview from "@/components/invitations/InviteCardPreview";
import InviteExportButtons from "@/components/invitations/InviteExportButtons";
import type { InviteCardContent, InviteTemplateId } from "@/lib/invitations/types";

interface InviteStepPreviewPanelProps {
  templateId: InviteTemplateId;
  content: InviteCardContent;
  slug?: string;
  showExport?: boolean;
}

export default function InviteStepPreviewPanel({
  templateId,
  content,
  slug = "invitation",
  showExport = true,
}: InviteStepPreviewPanelProps) {
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="rounded-xl border border-muted/30 bg-light overflow-hidden shadow-sm">
      <div className="px-3 py-2 border-b border-muted/20 flex items-center justify-between gap-2 min-h-[2.25rem]">
        <span className="text-xs font-medium text-muted">Card preview</span>
        {showExport ? (
          <button
            type="button"
            onClick={() => setExportOpen((o) => !o)}
            className="text-xs text-accent font-medium shrink-0"
          >
            {exportOpen ? "Hide download" : "Download"}
          </button>
        ) : null}
      </div>
      <div className="bg-cream px-3 py-3 w-full">
        <InviteCardPreview templateId={templateId} content={content} maxWidth={400} />
      </div>
      {showExport && exportOpen ? (
        <div className="px-3 pb-3 border-t border-muted/20 pt-2">
          <InviteExportButtons
            templateId={templateId}
            content={content}
            slug={slug}
            compact
          />
        </div>
      ) : null}
    </div>
  );
}
