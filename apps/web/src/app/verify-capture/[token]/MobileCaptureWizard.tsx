"use client";

import { useEffect, useState } from "react";
import CameraCapture from "@/components/verification/CameraCapture";
import StepIndicator from "@/components/wallet/StepIndicator";
import { SELFIE_CAPTURE_INSTRUCTIONS } from "@/lib/verification/selfie-instructions";
import {
  fetchPublicCaptureStatus,
  uploadPublicCaptureSlot,
} from "@/lib/verification/capture-client";

interface MobileCaptureWizardProps {
  token: string;
}

type Step = "selfie" | "id-front" | "id-back" | "done";

const STEP_ORDER: Exclude<Step, "done">[] = ["selfie", "id-front", "id-back"];

function stepNumber(step: Exclude<Step, "done">): number {
  return STEP_ORDER.indexOf(step) + 1;
}

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
      confirmLabel: string;
      captureKind: "selfie" | "id";
    }
  > = {
    selfie: {
      title: "Step 1 of 3: Selfie",
      captureLabel: "Capture Selfie",
      confirmLabel: "Continue to ID front",
      captureKind: "selfie",
    },
    "id-front": {
      title: "Step 2 of 3: ID front",
      captureLabel: "Capture ID Front",
      confirmLabel: "Continue to ID back",
      captureKind: "id",
      hint: "Hold the front of your ID to the camera.",
    },
    "id-back": {
      title: "Step 3 of 3: ID back",
      captureLabel: "Capture ID Back",
      confirmLabel: "Finish",
      captureKind: "id",
      hint: "Hold the back of your ID to the camera.",
    },
  };

  const current = labels[step];

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-lg font-bold text-surface text-center mb-1">
        Verify account photos
      </h1>
      <p className="text-sm text-muted text-center mb-4">
        Capture each photo, review it, then continue to the next step.
      </p>
      <StepIndicator total={3} current={stepNumber(step)} />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}
      <CameraCapture
        key={step}
        label={current.title}
        captureLabel={current.captureLabel}
        confirmLabel={current.confirmLabel}
        confirmDisabled={uploading}
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
