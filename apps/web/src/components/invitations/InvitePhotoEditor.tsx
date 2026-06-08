"use client";

import { useRef, useState } from "react";
import {
  clearInvitationPhoto,
  resetInvitationPhotoToEvent,
  uploadInvitationPhoto,
} from "@/app/actions/invitations";
import type { InviteCardContent } from "@/lib/invitations/types";
import { defaultPhotoUrlForEvent } from "@/lib/invitations/invite-photo";

interface InvitePhotoEditorProps {
  invitationId: string;
  eventSlug: string;
  hasEventPhoto: boolean;
  content: InviteCardContent;
  onContentChange: (patch: Partial<InviteCardContent>) => void;
  disabled?: boolean;
}

export default function InvitePhotoEditor({
  invitationId,
  eventSlug,
  hasEventPhoto,
  content,
  onContentChange,
  disabled,
}: InvitePhotoEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoHidden = content.photoUrl === "none" && !content.photoKey;

  async function onFile(file: File) {
    setError(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadInvitationPhoto(invitationId, fd);
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onContentChange({
      photoKey: res.key,
      photoUrl: undefined,
    });
  }

  async function useEvent() {
    setError(null);
    setBusy(true);
    const res = await resetInvitationPhotoToEvent(invitationId);
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onContentChange({
      photoKey: undefined,
      photoUrl: res.content.photoUrl ?? defaultPhotoUrlForEvent(eventSlug),
    });
  }

  async function removePhoto() {
    setError(null);
    setBusy(true);
    const res = await clearInvitationPhoto(invitationId);
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onContentChange({ photoKey: undefined, photoUrl: "none" });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted uppercase tracking-wide">
        Card photo
      </p>
      <p className="text-xs text-muted">
        {hasEventPhoto
          ? "Uses your event photo by default. Upload a different image for this card."
          : "Upload a photo for the memorial frame."}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled || busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className="text-sm px-3 py-2 rounded-lg border border-muted/40 bg-light hover:border-accent disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Upload photo"}
        </button>
        {hasEventPhoto ? (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => void useEvent()}
            className="text-sm px-3 py-2 rounded-lg border border-muted/40 bg-light hover:border-accent disabled:opacity-50"
          >
            Use event photo
          </button>
        ) : null}
        {!photoHidden ? (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => void removePhoto()}
            className="text-sm px-3 py-2 rounded-lg border border-muted/40 text-muted hover:border-accent disabled:opacity-50"
          >
            Remove photo
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-red-700">{error}</p>
      ) : photoHidden ? (
        <p className="text-xs text-muted">No photo on card.</p>
      ) : (
        <p className="text-xs text-muted">
          {content.photoKey
            ? "Custom photo uploaded."
            : hasEventPhoto
              ? "Showing event gallery photo."
              : "Photo set."}
        </p>
      )}
    </div>
  );
}
