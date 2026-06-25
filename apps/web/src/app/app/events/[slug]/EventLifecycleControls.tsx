"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  pauseEvent,
  resumeEvent,
  stopEvent,
} from "@/app/actions/events";
import type { CeremonyEvent } from "@/lib/types";
import {
  eventStatusBadgeClass,
  eventStatusLabel,
} from "@/lib/event-lifecycle";
import EventProgressReportPanel from "@/components/EventProgressReportPanel";

interface EventLifecycleControlsProps {
  event: CeremonyEvent;
}

export default function EventLifecycleControls({
  event,
}: EventLifecycleControlsProps) {
  const router = useRouter();
  const status = event.status ?? "active";
  const [loading, setLoading] = useState<"pause" | "resume" | "stop" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [stopMessage, setStopMessage] = useState("");

  async function handlePause() {
    setError(null);
    setLoading("pause");
    const result = await pauseEvent(event.slug);
    setLoading(null);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error ?? "Failed to pause event.");
    }
  }

  async function handleResume() {
    setError(null);
    setLoading("resume");
    const result = await resumeEvent(event.slug);
    setLoading(null);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error ?? "Failed to resume event.");
    }
  }

  async function handleStop(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const message = stopMessage.trim();
    if (!message) {
      setError("Enter a message for contributors.");
      return;
    }
    setLoading("stop");
    const result = await stopEvent(event.slug, message);
    setLoading(null);
    if (result.success) {
      setStopModalOpen(false);
      setStopMessage("");
      router.refresh();
    } else {
      setError(result.error ?? "Failed to stop event.");
    }
  }

  const canPause = status === "active";
  const canResume = status === "paused";
  const canStop = status === "active" || status === "paused";
  const readOnly = status === "stopped" || status === "suspended";

  return (
    <>
      <div className="mb-4 rounded-xl border border-muted/30 bg-light p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">
              Collection status
            </p>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${eventStatusBadgeClass(status)}`}
            >
              {eventStatusLabel(status)}
            </span>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              {canPause && (
                <button
                  type="button"
                  onClick={handlePause}
                  disabled={loading !== null}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 disabled:opacity-50"
                >
                  {loading === "pause" ? "Pausing…" : "Pause"}
                </button>
              )}
              {canResume && (
                <button
                  type="button"
                  onClick={handleResume}
                  disabled={loading !== null}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-accent/30 text-accent bg-accent/5 hover:bg-accent/10 disabled:opacity-50"
                >
                  {loading === "resume" ? "Resuming…" : "Resume"}
                </button>
              )}
              {canStop && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStopModalOpen(true);
                  }}
                  disabled={loading !== null}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-muted/40 text-muted hover:bg-muted/10 disabled:opacity-50"
                >
                  Stop event
                </button>
              )}
            </div>
          )}
        </div>
        {status === "suspended" && (
          <p className="text-xs text-muted">
            This event was suspended by platform administrators. Contact support
            if you believe this is an error.
          </p>
        )}
        {status === "stopped" && event.statusMessage && (
          <p className="text-xs text-muted mt-2 whitespace-pre-wrap">
            {event.statusMessage}
          </p>
        )}
        {status === "stopped" && (
          <EventProgressReportPanel eventSlug={event.slug} />
        )}
        {error && !stopModalOpen && (
          <p className="text-xs text-red-600 mt-2" role="alert">
            {error}
          </p>
        )}
      </div>

      {stopModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-surface/80"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stop-event-title"
          onClick={() => {
            if (loading !== "stop") setStopModalOpen(false);
          }}
        >
          <form
            className="bg-light rounded-xl border border-muted/30 shadow-lg max-w-lg w-full p-4"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleStop}
          >
            <h2
              id="stop-event-title"
              className="font-bold text-surface mb-2"
            >
              Stop event
            </h2>
            <p className="text-sm text-muted mb-3">
              This permanently ends collection for this event. Contributors will
              see your message instead of the contribute form.
            </p>
            <label className="block text-sm font-medium text-surface mb-1">
              Message for contributors
            </label>
            <textarea
              value={stopMessage}
              onChange={(e) => setStopMessage(e.target.value)}
              rows={4}
              maxLength={500}
              required
              className="w-full text-sm border border-muted/50 rounded-lg px-3 py-2 text-surface mb-2 resize-y min-h-[6rem]"
              placeholder="Thank you for your support. We have reached our goal and are no longer accepting contributions."
            />
            <p className="text-xs text-muted mb-3">
              {stopMessage.length}/500 characters
            </p>
            {error && (
              <p className="text-xs text-red-600 mb-3" role="alert">
                {error}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setStopModalOpen(false)}
                disabled={loading === "stop"}
                className="px-4 py-2 text-sm text-muted font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading === "stop"}
                className="px-4 py-2 text-sm bg-surface text-light font-semibold rounded-lg disabled:opacity-50"
              >
                {loading === "stop" ? "Stopping…" : "Stop event"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
