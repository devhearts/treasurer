"use client";

import { useEffect, useState } from "react";
import CameraCapture from "@/components/verification/CameraCapture";
import { SELFIE_CAPTURE_INSTRUCTIONS } from "@/lib/verification/selfie-instructions";
import {
  fetchPublicCaptureStatus,
  uploadPublicCaptureSlot,
} from "@/lib/verification/capture-client";

interface MobileCaptureWizardProps {
  token: string;
}

type Step = "selfie" | "id-front" | "id-back" | "done";

export default function MobileCaptureWizard({ token }: MobileCaptureWizardProps) {
  const [valid, setValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("selfie");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const s = await fetchPublicCaptureStatus(token);
        setValid(s.valid);
        if (!s.valid) setError("This capture link is invalid or has expired.");
        else if (s.slots.idBack) setStep("done");
        else if (s.slots.idFront) setStep("id-back");
        else if (s.slots.selfie) setStep("id-front");
      } catch (e) {
        setValid(false);
        setError(e instanceof Error ? e.message : "Could not load capture link.");
      }
    })();
  }, [token]);

  async function upload(slot: Step, blob: Blob) {
    if (slot === "done") return;
    setUploading(true);
    setError(null);
    try {
      await uploadPublicCaptureSlot(token, slot, blob);
      if (slot === "selfie") setStep("id-front");
      else if (slot === "id-front") setStep("id-back");
      else setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (valid === null) {
    return (
      <p className="text-sm text-muted text-center py-12">Loading…</p>
    );
  }

  if (!valid) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-red-600">{error ?? "Invalid link."}</p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-3">
        <p className="text-lg font-bold text-surface">All photos captured</p>
        <p className="text-sm text-muted">
          Return to your computer to review and submit your verification.
        </p>
      </div>
    );
  }

  const labels: Record<
    Exclude<Step, "done">,
    {
      title: string;
      hint?: string;
      captureLabel: string;
      captureKind: "selfie" | "id";
    }
  > = {
    selfie: {
      title: "Selfie",
      captureLabel: "Capture Selfie",
      captureKind: "selfie",
    },
    "id-front": {
      title: "ID front",
      captureLabel: "Capture ID Front",
      captureKind: "id",
      hint: "Hold the front of your ID to the camera.",
    },
    "id-back": {
      title: "ID back",
      captureLabel: "Capture ID Back",
      captureKind: "id",
      hint: "Hold the back of your ID to the camera.",
    },
  };

  const current = labels[step];

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}
      <CameraCapture
        label={current.title}
        captureLabel={current.captureLabel}
        captureKind={current.captureKind}
        hint={current.hint || undefined}
        instructions={
          step === "selfie" ? SELFIE_CAPTURE_INSTRUCTIONS : undefined
        }
        faceGuide={step === "selfie"}
        onCapture={(blob) => void upload(step, blob)}
      />
      {uploading && (
        <p className="text-sm text-muted text-center mt-4">Uploading…</p>
      )}
    </div>
  );
}
