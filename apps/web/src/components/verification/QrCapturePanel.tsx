"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  createCaptureSession,
  pollCaptureSession,
} from "@/app/actions/verification";
import type { CaptureSessionPoll } from "@/lib/verification/types";

interface QrCapturePanelProps {
  onComplete: (sessionId: string) => void;
}

export default function QrCapturePanel({ onComplete }: QrCapturePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [captureUrl, setCaptureUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [poll, setPoll] = useState<CaptureSessionPoll | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await createCaptureSession();
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      setCaptureUrl(result.data.captureUrl);
      setSessionId(result.data.sessionId);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!captureUrl || !canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, captureUrl, {
      width: 220,
      margin: 2,
    });
  }, [captureUrl]);

  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(async () => {
      try {
        const p = await pollCaptureSession(sessionId);
        setPoll(p);
        if (p.complete) {
          clearInterval(id);
          onComplete(sessionId);
        }
      } catch {
        /* keep polling */
      }
    }, 2000);
    return () => clearInterval(id);
  }, [sessionId, onComplete]);

  if (loading) {
    return (
      <p className="text-sm text-muted text-center py-8">Preparing QR code…</p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
        {error}
      </p>
    );
  }

  return (
    <div className="text-center space-y-4">
      <p className="text-sm text-muted">
        Scan with your phone to capture photos one at a time: selfie, then ID
        front, then ID back. Review each photo on your phone before continuing.
      </p>
      <canvas ref={canvasRef} className="mx-auto rounded-lg border border-muted/30" />
      <div className="space-y-2">
        <p className="text-xs font-medium text-surface uppercase tracking-wide">
          Progress on phone
        </p>
        <div className="flex justify-center gap-6 text-sm">
          <SlotCheck label="Selfie" done={poll?.selfie} active={!poll?.selfie} />
          <SlotCheck
            label="ID front"
            done={poll?.idFront}
            active={!!poll?.selfie && !poll?.idFront}
          />
          <SlotCheck
            label="ID back"
            done={poll?.idBack}
            active={!!poll?.idFront && !poll?.idBack}
          />
        </div>
      </div>
      {poll?.selfie && !poll?.idFront && (
        <p className="text-sm text-muted">Phone: reviewing or capturing ID front…</p>
      )}
      {poll?.idFront && !poll?.idBack && (
        <p className="text-sm text-muted">Phone: reviewing or capturing ID back…</p>
      )}
      {poll?.complete && (
        <p className="text-sm text-accent font-medium">
          All photos captured on your phone.
        </p>
      )}
    </div>
  );
}

function SlotCheck({
  label,
  done,
  active,
}: {
  label: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <span
      className={
        done
          ? "text-accent font-medium"
          : active
            ? "text-surface font-medium"
            : "text-muted"
      }
    >
      {done ? "✓" : active ? "●" : "○"} {label}
    </span>
  );
}
