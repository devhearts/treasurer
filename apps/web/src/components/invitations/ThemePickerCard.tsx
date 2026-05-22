"use client";

import InviteCardPreview from "@/components/invitations/InviteCardPreview";
import type { InviteTemplateMeta } from "@/lib/invitations/templates";
import { THEME_SAMPLE_CONTENT } from "@/lib/invitations/theme-sample-content";
import type { InviteTemplateId } from "@/lib/invitations/types";

interface ThemePickerCardProps {
  template: InviteTemplateMeta;
  selected: boolean;
  disabled?: boolean;
  onSelect: (id: InviteTemplateId) => void;
}

export default function ThemePickerCard({
  template,
  selected,
  disabled,
  onSelect,
}: ThemePickerCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(template.id)}
      className={`w-full rounded-xl overflow-hidden text-left transition-all ${
        selected
          ? "border-[3px] border-accent ring-4 ring-accent/50 ring-offset-2 ring-offset-cream shadow-[0_0_0_1px_rgba(160,200,120,0.4)]"
          : "border-2 border-muted/30 hover:border-accent/40"
      } disabled:opacity-50`}
      aria-pressed={selected}
    >
      <div className="w-full bg-cream p-2 sm:p-2.5 pointer-events-none">
        <InviteCardPreview
          templateId={template.id}
          content={THEME_SAMPLE_CONTENT}
          className="w-full"
        />
      </div>
      <div className="bg-light px-3 py-2.5 border-t border-muted/20 min-h-[3.25rem]">
        <p className="text-sm font-medium text-surface leading-tight">
          {template.name}
        </p>
        <p className="text-xs text-muted mt-0.5 leading-snug">{template.tag}</p>
      </div>
    </button>
  );
}
