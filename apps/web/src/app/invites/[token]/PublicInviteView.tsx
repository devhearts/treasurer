"use client";

import { useState } from "react";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import InviteCardPreview from "@/components/invitations/InviteCardPreview";
import { eventHasGalleryPhoto } from "@/lib/invitations/invite-photo";
import type { PublicInvitePayload, RsvpStatus } from "@/lib/invitations/types";
import { normalizeInviteCardContent } from "@/lib/invitations/parse-invite-content";
import { submitInvitationRsvp } from "@/app/actions/invitations";
import { formatCalendarDate } from "@/lib/data";

function normalizePublicPayload(payload: PublicInvitePayload): PublicInvitePayload {
  return {
    ...payload,
    invitation: {
      ...payload.invitation,
      content: normalizeInviteCardContent(payload.invitation.content),
    },
  };
}

interface PublicInviteViewProps {
  viewToken: string;
  initial: PublicInvitePayload;
}

const STATUS_LABEL: Record<RsvpStatus, string> = {
  pending: "Awaiting your response",
  accepted: "You accepted",
  declined: "You declined",
  maybe: "You responded Maybe",
};

export default function PublicInviteView({
  viewToken,
  initial,
}: PublicInviteViewProps) {
  const [data, setData] = useState(() => normalizePublicPayload(initial));
  const [selectedStatus, setSelectedStatus] = useState<
    "accepted" | "declined" | "maybe" | null
  >(initial.rsvp.status === "pending" ? null : initial.rsvp.status);
  const [message, setMessage] = useState(initial.rsvp.message ?? "");
  const [changeResponse, setChangeResponse] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { invitation, event, rsvp } = data;
  const content = invitation.content;
  const hasResponded = rsvp.status !== "pending";
  const rsvpOpen =
    content.rsvpEnabled &&
    invitation.status === "published" &&
    !rsvp.deadlinePassed;
  const showRsvpForm = rsvpOpen && (!hasResponded || changeResponse);
  const showRsvpSummary = content.rsvpEnabled && hasResponded && !changeResponse;

  const deadlineLabel = content.rsvpDeadline
    ? formatCalendarDate(content.rsvpDeadline.slice(0, 10), "long")
    : null;

  const recordedAt = rsvp.at
    ? new Date(rsvp.at.replace(" ", "T") + "Z").toLocaleString("en-UG", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  async function handleSubmit() {
    if (!selectedStatus) {
      setError("Please choose Accept, Maybe, or Decline.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updated = await submitInvitationRsvp(viewToken, {
        status: selectedStatus,
        message: message.trim() || undefined,
      });
      setData(normalizePublicPayload(updated));
      setSelectedStatus(
        updated.rsvp.status === "pending" ? null : updated.rsvp.status
      );
      setMessage(updated.rsvp.message ?? "");
      setChangeResponse(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save RSVP.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream print:bg-white">
      <div className="max-w-lg mx-auto px-4 py-8 print:py-4">
        <p className="text-center text-sm text-muted mb-2 print:hidden">
          Dear <span className="text-surface font-medium">{data.guestName}</span>,
          you&apos;re invited to
        </p>
        <p className="text-center text-lg font-medium text-surface mb-6 print:hidden">
          {event.title}
        </p>

        <InviteCardPreview
          templateId={invitation.templateId}
          content={content}
          maxWidth={420}
          className="w-full"
          eventSlug={event.slug}
          invitationId={invitation.id}
          viewToken={viewToken}
          hasEventPhoto={
            Boolean(content.photoUrl?.includes("/gallery/")) ||
            Boolean(content.photoKey)
          }
        />

        {content.rsvpEnabled ? (
          <section className="mt-8 print:hidden">
            <h2 className="text-[15px] font-medium text-surface text-center mb-1">
              RSVP
            </h2>
            {content.rsvpNote ? (
              <p className="text-xs text-muted text-center mb-4">
                {content.rsvpNote}
              </p>
            ) : null}
            {deadlineLabel ? (
              <p className="text-[11px] text-muted text-center mb-4">
                Please respond by {deadlineLabel}
              </p>
            ) : null}

            {error ? (
              <p className="text-sm text-[#a32d2d] text-center mb-3">{error}</p>
            ) : null}

            {rsvp.deadlinePassed && rsvp.status === "pending" ? (
              <p className="text-center text-sm text-muted py-4 bg-light rounded-xl border border-muted/30">
                The RSVP deadline has passed. Please contact the host if you
                still wish to attend.
              </p>
            ) : null}

            {showRsvpSummary ? (
              <div className="bg-light rounded-xl border border-muted/30 overflow-hidden">
                <div className="px-4 py-4 text-center border-b border-muted/20">
                  <p className="text-lg font-medium text-surface">
                    {STATUS_LABEL[rsvp.status]}
                  </p>
                  {recordedAt ? (
                    <p className="text-xs text-muted mt-1">
                      Recorded {recordedAt}
                    </p>
                  ) : null}
                </div>
                {rsvp.message?.trim() ? (
                  <div className="px-4 py-3 border-b border-muted/20">
                    <p className="text-xs font-medium text-muted mb-1">
                      Your message
                    </p>
                    <p className="text-sm text-surface whitespace-pre-wrap">
                      {rsvp.message}
                    </p>
                  </div>
                ) : null}
                {rsvpOpen ? (
                  <div className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setChangeResponse(true);
                        setSelectedStatus(
                          rsvp.status === "pending" ? null : rsvp.status
                        );
                        setError(null);
                      }}
                      className="text-sm text-accent font-medium hover:underline"
                    >
                      Change your response
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {showRsvpForm ? (
              <div className="space-y-4">
                {hasResponded && changeResponse ? (
                  <p className="text-xs text-muted text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setChangeResponse(false);
                        setError(null);
                      }}
                      className="text-accent font-medium hover:underline"
                    >
                      Cancel
                    </button>
                    {" · "}
                    Update your response below
                  </p>
                ) : null}

                <div>
                  <p className="text-xs font-medium text-muted mb-2 text-center">
                    Your response
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ["accepted", "Accept"],
                        ["maybe", "Maybe"],
                        ["declined", "Decline"],
                      ] as const
                    ).map(([s, label]) => (
                      <button
                        key={s}
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setSelectedStatus(s);
                          setError(null);
                        }}
                        className={`py-3 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 ${
                          selectedStatus === s
                            ? "bg-surface text-light border-surface"
                            : s === "accepted"
                              ? "bg-lime/30 text-[#27500A] border-lime/50 hover:bg-lime/50"
                              : s === "declined"
                                ? "bg-red-50 text-[#a32d2d] border-red-200 hover:bg-red-100"
                                : "bg-light text-surface border-muted/30 hover:border-accent"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted">Message (optional)</label>
                  <textarea
                    rows={3}
                    className="w-full mt-1 border border-muted/40 rounded-lg px-3 py-2 text-sm resize-none"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add a note for the host"
                  />
                </div>

                <button
                  type="button"
                  disabled={loading || !selectedStatus}
                  onClick={() => void handleSubmit()}
                  className="w-full py-3 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-50"
                >
                  {loading
                    ? "Saving…"
                    : hasResponded
                      ? "Update RSVP"
                      : "Submit RSVP"}
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="mt-8 text-center print:hidden">
          <Link
            href={`/events/${event.slug}`}
            className="text-sm text-accent font-medium hover:underline"
          >
            View event page →
          </Link>
        </div>
      </div>

      <div className="print:hidden">
        <SiteFooter />
      </div>
    </div>
  );
}
