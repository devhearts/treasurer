"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getProgressReportStatus,
  requestProgressReport,
} from "@/app/actions/events";
import type { EventProgressReport } from "@/lib/types";

const POLL_MS = 2500;
const MAX_POLLS = 48;

interface EventProgressReportPanelProps {
  eventSlug: string;
}

function formatReportTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-UG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventProgressReportPanel({
  eventSlug,
}: EventProgressReportPanelProps) {
  const [report, setReport] = useState<EventProgressReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    const status = await getProgressReportStatus(eventSlug);
    if (status) {
      setReport(status);
    }
    return status;
  }, [eventSlug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const status = await getProgressReportStatus(eventSlug);
      if (!cancelled) {
        setReport(status);
        setInitialLoad(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventSlug]);

  useEffect(() => {
    if (report?.status !== "pending") {
      clearPoll();
      return;
    }

    let polls = 0;
    pollRef.current = setInterval(async () => {
      polls += 1;
      const status = await refreshStatus();
      if (!status || status.status !== "pending" || polls >= MAX_POLLS) {
        clearPoll();
        if (polls >= MAX_POLLS && status?.status === "pending") {
          setError("Report generation is taking longer than expected. Try again later.");
        }
      }
    }, POLL_MS);

    return clearPoll;
  }, [report?.status, refreshStatus, clearPoll]);

  async function handleRequest() {
    setError(null);
    setLoading(true);
    const result = await requestProgressReport(eventSlug);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setReport(result.report);
  }

  const isPending = report?.status === "pending" || loading;
  const isReady = report?.status === "ready";
  const isFailed = report?.status === "failed";
  const showRequest =
    !initialLoad && !isPending && (!report?.status || isFailed);

  return (
    <div className="mt-4 pt-4 border-t border-muted/20">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
        Progress report
      </p>

      {initialLoad && (
        <p className="text-xs text-muted">Loading report status…</p>
      )}

      {isPending && (
        <p className="text-xs text-muted flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 border-2 border-muted/40 border-t-accent rounded-full animate-spin"
            aria-hidden
          />
          Generating report…
        </p>
      )}

      {isReady && report.downloadPath && (
        <div className="space-y-2">
          <p className="text-xs text-muted">
            Generated on{" "}
            {formatReportTimestamp(report.completedAt ?? report.createdAt ?? "")}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={report.downloadPath}
              className="inline-flex items-center px-3 py-2 text-xs font-semibold rounded-lg border border-accent/30 text-accent bg-accent/5 hover:bg-accent/10"
              download
            >
              Download PDF
            </a>
            <button
              type="button"
              onClick={handleRequest}
              disabled={loading}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-muted/40 text-muted hover:bg-muted/10 disabled:opacity-50"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}

      {showRequest && (
        <button
          type="button"
          onClick={handleRequest}
          disabled={loading}
          className="px-3 py-2 text-xs font-semibold rounded-lg border border-muted/40 text-surface hover:bg-muted/10 disabled:opacity-50"
        >
          {isFailed ? "Try again" : "Request progress report"}
        </button>
      )}

      {isFailed && report.errorMessage && (
        <p className="text-xs text-red-600 mt-2" role="alert">
          {report.errorMessage}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
