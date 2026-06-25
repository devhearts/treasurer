"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StepIndicator from "@/components/wallet/StepIndicator";
import CameraCapture from "@/components/verification/CameraCapture";
import QrCapturePanel from "@/components/verification/QrCapturePanel";
import {
  submitVerificationWithImages,
  submitVerificationWithSession,
} from "@/app/actions/verification";
import { resendVerificationEmail } from "@/app/actions/auth";
import type { VerificationStatus } from "@/lib/verification/types";
import { SELFIE_CAPTURE_INSTRUCTIONS } from "@/lib/verification/selfie-instructions";
import {
  validateVerificationDetails,
  type VerificationDetailsErrors,
} from "@/lib/verification/verify-details-validation";
import { IconBack } from "@/components/Icons";

type CaptureMode = "device" | "phone" | null;

interface VerifyAccountWizardProps {
  initialStatus: VerificationStatus;
  userEmail: string;
  emailVerified: boolean;
}

function isDesktopViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 768px)").matches;
}

export default function VerifyAccountWizard({
  initialStatus,
  userEmail,
  emailVerified,
}: VerifyAccountWizardProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [step, setStep] = useState(1);
  const [legalName, setLegalName] = useState("");
  const [phone, setPhone] = useState("");
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [captureSessionId, setCaptureSessionId] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<Blob | null>(null);
  const [idFront, setIdFront] = useState<Blob | null>(null);
  const [idBack, setIdBack] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<VerificationDetailsErrors>(
    {}
  );
  const [resubmitting, setResubmitting] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  async function handleResendVerificationEmail() {
    setResendMessage(null);
    setResendError(null);
    setResendLoading(true);
    const result = await resendVerificationEmail(userEmail.trim());
    setResendLoading(false);
    if (result.success) {
      setResendMessage(
        "If this address has an unverified account, we sent another email."
      );
    } else {
      setResendError(result.error);
    }
  }

  function continueFromDetailsStep() {
    const { valid, errors } = validateVerificationDetails(legalName, phone);
    if (!valid) {
      setFieldErrors(errors);
      setError(null);
      return;
    }
    setFieldErrors({});
    setError(null);
    if (isDesktopViewport()) setStep(2);
    else {
      setCaptureMode("device");
      setStep(3);
    }
  }

  const onQrComplete = useCallback((sessionId: string) => {
    setCaptureSessionId(sessionId);
    setStep(6);
  }, []);

  const switchToPhoneCapture = useCallback(() => {
    setCaptureMode("phone");
    setSelfie(null);
    setIdFront(null);
    setIdBack(null);
    setStep(3);
  }, []);

  async function handleSubmit() {
    const { valid, errors } = validateVerificationDetails(legalName, phone);
    if (!valid) {
      setFieldErrors(errors);
      setError("Fix your name and phone number before submitting.");
      setStep(1);
      return;
    }
    setFieldErrors({});
    setError(null);
    setLoading(true);
    try {
      if (captureSessionId) {
        const result = await submitVerificationWithSession(
          legalName,
          phone,
          captureSessionId
        );
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else if (selfie && idFront && idBack) {
        const result = await submitVerificationWithImages(legalName, phone, {
          selfie,
          idFront,
          idBack,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else {
        setError("Complete all photo captures before submitting.");
        return;
      }
      setStatus((s) => ({ ...s, status: "pending_review" }));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (status.status === "none") {
    return (
      <StatusCard title="Verify your account">
        <p className="text-sm text-muted mb-4">
          Verify your identity to withdraw funds. Complete email verification
          first, then return here to continue.
        </p>
        {resendMessage ? (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-4">
            {resendMessage}
          </p>
        ) : null}
        {resendError ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">
            {resendError}
          </p>
        ) : null}
        {!emailVerified ? (
          <button
            type="button"
            disabled={resendLoading || !userEmail.trim()}
            onClick={() => void handleResendVerificationEmail()}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-medium py-3 rounded-lg"
          >
            {resendLoading ? "Sending…" : "Resend email verification link"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.refresh()}
            className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-3 rounded-lg"
          >
            Continue
          </button>
        )}
      </StatusCard>
    );
  }

  if (status.status === "pending_review") {
    return (
      <StatusCard title="Under review">
        <p className="text-sm text-muted">
          Your documents have been submitted. We will notify you once review is
          complete.
        </p>
        {status.submittedAt && (
          <p className="text-xs text-muted mt-2">
            Submitted {new Date(status.submittedAt).toLocaleString()}
          </p>
        )}
      </StatusCard>
    );
  }

  if (status.status === "rejected" && !resubmitting) {
    return (
      <StatusCard title="Verification rejected">
        <p className="text-sm text-muted">
          Your submission was not approved. Review the reason below before
          submitting again.
        </p>
        {status.rejectionReason ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
            {status.rejectionReason}
          </p>
        ) : (
          <p className="text-sm text-muted mt-3">
            No additional reason was provided.
          </p>
        )}
        {status.submittedAt && (
          <p className="text-xs text-muted mt-2">
            Submitted {new Date(status.submittedAt).toLocaleString()}
          </p>
        )}
        <button
          type="button"
          onClick={() => setResubmitting(true)}
          className="w-full mt-5 bg-accent hover:bg-accent/90 text-white font-medium py-3 rounded-lg"
        >
          Submit again
        </button>
        <Link
          href="/app/account"
          className="inline-flex text-sm font-medium text-accent hover:underline mt-4"
        >
          Back to account
        </Link>
      </StatusCard>
    );
  }

  if (status.status === "verified") {
    return (
      <StatusCard title="Account verified">
        <p className="inline-flex items-center gap-2 text-sm text-accent font-medium">
          <span className="w-2 h-2 rounded-full bg-accent" aria-hidden />
          Your account is verified. You can withdraw to your verified phone
          number.
        </p>
        {status.verifiedAt && (
          <p className="text-xs text-muted mt-2">
            Verified {new Date(status.verifiedAt).toLocaleString()}
          </p>
        )}
      </StatusCard>
    );
  }

  const totalSteps = captureMode === "phone" ? 6 : 6;
  const showDesktopChoice = step === 2 && isDesktopViewport() && !captureMode;

  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      <Link
        href="/app/account"
        className="inline-flex items-center gap-1 text-muted hover:text-surface text-sm py-4"
      >
        <IconBack className="w-4 h-4" />
        Back to account
      </Link>

      <h1 className="text-xl font-bold text-surface mb-1">Verify account</h1>
      <p className="text-sm text-muted mb-4">
        Submit a selfie and photos of your ID. Your MoMo number must be registered
        in the same name as on your ID.
      </p>

      <StepIndicator total={totalSteps} current={step} />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mt-4">
          {error}
        </p>
      )}

      <div className="mt-6 bg-light rounded-xl border border-muted/30 p-4">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="legal-name" className="block text-sm font-medium text-surface mb-1">
                Full legal name (as on Government ID)
              </label>
              <input
                id="legal-name"
                value={legalName}
                onChange={(e) => {
                  setLegalName(e.target.value);
                  if (fieldErrors.legalName) {
                    setFieldErrors((prev) => ({ ...prev, legalName: undefined }));
                  }
                }}
                autoComplete="name"
                aria-invalid={!!fieldErrors.legalName}
                aria-describedby={
                  fieldErrors.legalName ? "legal-name-error" : undefined
                }
                className={`w-full border rounded-lg px-4 py-3 text-surface ${
                  fieldErrors.legalName
                    ? "border-red-400 focus:ring-red-400"
                    : "border-muted/50"
                }`}
              />
              {fieldErrors.legalName && (
                <p
                  id="legal-name-error"
                  className="text-sm text-red-600 mt-1"
                >
                  {fieldErrors.legalName}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="verify-phone" className="block text-sm font-medium text-surface mb-1">
                Mobile money phone number registered in the same name as on Government ID
              </label>
              <input
                id="verify-phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (fieldErrors.phone) {
                    setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                  }
                }}
                placeholder="07… or 256…"
                autoComplete="tel"
                aria-invalid={!!fieldErrors.phone}
                aria-describedby={
                  fieldErrors.phone ? "verify-phone-error" : undefined
                }
                className={`w-full border rounded-lg px-4 py-3 text-surface ${
                  fieldErrors.phone
                    ? "border-red-400 focus:ring-red-400"
                    : "border-muted/50"
                }`}
              />
              {fieldErrors.phone && (
                <p id="verify-phone-error" className="text-sm text-red-600 mt-1">
                  {fieldErrors.phone}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={continueFromDetailsStep}
              className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-3 rounded-lg"
            >
              Continue
            </button>
          </div>
        )}

        {showDesktopChoice && (
          <div className="space-y-3">
            <p className="text-sm text-muted">How would you like to capture photos?</p>
            <button
              type="button"
              onClick={() => {
                setCaptureMode("device");
                setStep(3);
              }}
              className="w-full border border-muted/40 rounded-lg py-3 text-sm font-medium hover:bg-muted/5"
            >
              Use this device&apos;s camera
            </button>
            <button
              type="button"
              onClick={() => {
                setCaptureMode("phone");
                setStep(3);
              }}
              className="w-full bg-accent text-white rounded-lg py-3 text-sm font-medium hover:bg-accent/90"
            >
              Scan QR with your phone
            </button>
          </div>
        )}

        {step === 3 && captureMode === "phone" && (
          <QrCapturePanel onComplete={onQrComplete} />
        )}

        {step === 3 && captureMode === "device" && (
          <CameraCapture
            key="selfie"
            label="Step 1 of 3: Selfie"
            captureLabel="Capture Selfie"
            confirmLabel="Continue to ID front"
            captureKind="selfie"
            instructions={SELFIE_CAPTURE_INSTRUCTIONS}
            faceGuide
            onCapture={(blob) => {
              setSelfie(blob);
              setStep(4);
            }}
            onUsePhoneInstead={switchToPhoneCapture}
          />
        )}

        {step === 4 && captureMode === "device" && (
          <CameraCapture
            key="id-front"
            label="Step 2 of 3: ID front"
            captureLabel="Capture ID Front"
            confirmLabel="Continue to ID back"
            captureKind="id"
            hint="Hold the front of your ID to the camera."
            onCapture={(blob) => {
              setIdFront(blob);
              setStep(5);
            }}
            onUsePhoneInstead={switchToPhoneCapture}
          />
        )}

        {step === 5 && captureMode === "device" && (
          <CameraCapture
            key="id-back"
            label="Step 3 of 3: ID back"
            captureLabel="Capture ID Back"
            confirmLabel="Review submission"
            captureKind="id"
            hint="Hold the back of your ID to the camera."
            onCapture={(blob) => {
              setIdBack(blob);
              setStep(6);
            }}
            onUsePhoneInstead={switchToPhoneCapture}
          />
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 className="font-bold text-surface">Review</h2>
            <dl className="text-sm space-y-2">
              <div>
                <dt className="text-muted">Name</dt>
                <dd className="font-medium text-surface">{legalName}</dd>
              </div>
              <div>
                <dt className="text-muted">Phone</dt>
                <dd className="font-medium text-surface">{phone}</dd>
              </div>
              <div>
                <dt className="text-muted">Photos</dt>
                <dd className="text-surface">
                  {captureSessionId
                    ? "Captured on phone ✓"
                    : selfie && idFront && idBack
                      ? "Selfie, ID front, ID back ✓"
                      : "Incomplete"}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleSubmit()}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-medium py-3 rounded-lg"
            >
              {loading ? "Submitting…" : "Submit for review"}
            </button>
          </div>
        )}
      </div>

      {step === 3 && captureMode === "device" && (
        <p className="text-xs text-muted text-center mt-3">
          Capture your selfie, review it, then continue to ID photos.
        </p>
      )}
    </div>
  );
}

function StatusCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link
        href="/app/account"
        className="inline-flex items-center gap-1 text-muted hover:text-surface text-sm mb-4"
      >
        <IconBack className="w-4 h-4" />
        Back to account
      </Link>
      <div className="bg-light rounded-xl border border-muted/30 p-6">
        <h1 className="text-xl font-bold text-surface mb-3">{title}</h1>
        {children}
      </div>
    </div>
  );
}
