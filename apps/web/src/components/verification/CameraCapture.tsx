"use client";

import { useEffect, useId, useRef, useState } from "react";
import { IconSwitchCamera } from "@/components/Icons";

type CameraFacingMode = "user" | "environment";

interface CameraCaptureProps {
  label: string;
  hint?: string;
  /** Primary capture button label, e.g. "Capture Selfie". */
  captureLabel: string;
  /** Short checklist shown above the camera (e.g. selfie guidance). */
  instructions?: readonly string[];
  /** Oval face positioning guide over the live preview. */
  faceGuide?: boolean;
  /** Selfie → front camera; ID → rear camera (overridable via switch). */
  captureKind?: "selfie" | "id";
  /** Override default camera for this capture step. */
  defaultFacingMode?: CameraFacingMode;
  onCapture: (blob: Blob) => void;
  /** Optional fallback when camera cannot start (does not auto-invoke). */
  onUsePhoneInstead?: () => void;
}

function FaceOverlayGuide({ maskId }: { maskId: string }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 100 133"
        preserveAspectRatio="none"
      >
        <defs>
          <mask id={maskId}>
            <rect width="100" height="133" fill="white" />
            <ellipse cx="50" cy="50" rx="30" ry="40" fill="black" />
          </mask>
        </defs>
        <rect
          width="100"
          height="133"
          fill="rgba(0,0,0,0.42)"
          mask={`url(#${maskId})`}
        />
        <ellipse
          cx="50"
          cy="50"
          rx="30"
          ry="40"
          fill="none"
          stroke="white"
          strokeWidth="0.75"
          strokeDasharray="2.5 1.5"
          opacity="0.92"
        />
      </svg>
      <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/85 px-3">
        Align your face in the oval
      </p>
    </div>
  );
}

function facingModeConstraints(
  facingMode: CameraFacingMode
): MediaStreamConstraints[] {
  return [
    {
      video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 } },
      audio: false,
    },
    { video: { facingMode, width: { ideal: 1280 } }, audio: false },
    { video: { facingMode: { ideal: facingMode } }, audio: false },
    { video: { facingMode }, audio: false },
  ];
}

async function openCameraStream(
  facingMode: CameraFacingMode
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera is not available on this device.");
  }

  const attempts: MediaStreamConstraints[] = [
    ...facingModeConstraints(facingMode),
    // Last resort when the device has no matching camera (e.g. desktop webcam only).
    { video: { width: { ideal: 1280 } }, audio: false },
    { video: true, audio: false },
  ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

function defaultFacingForKind(
  captureKind: "selfie" | "id" | undefined,
  override?: CameraFacingMode
): CameraFacingMode {
  if (override) return override;
  return captureKind === "id" ? "environment" : "user";
}

function isBenignPlayError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  if (e.name === "AbortError") return true;
  const msg = e.message.toLowerCase();
  return msg.includes("interrupted") || msg.includes("aborted");
}

function cameraErrorMessage(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "NotAllowedError") {
      return "Camera permission denied. Allow camera access in your browser settings.";
    }
    if (e.name === "NotFoundError") {
      return "No camera found on this device.";
    }
    if (isBenignPlayError(e)) return "";
    if (e.message) return e.message;
  }
  return "Could not access camera.";
}

async function attachStreamToVideo(
  video: HTMLVideoElement,
  stream: MediaStream
): Promise<void> {
  video.srcObject = stream;
  try {
    await video.play();
  } catch (e) {
    if (!isBenignPlayError(e)) throw e;
  }
}

export default function CameraCapture({
  label,
  hint,
  captureLabel,
  instructions,
  faceGuide = false,
  captureKind,
  defaultFacingMode,
  onCapture,
  onUsePhoneInstead,
}: CameraCaptureProps) {
  const preferredFacing = defaultFacingForKind(captureKind, defaultFacingMode);
  const faceMaskId = `face-guide-${useId().replace(/:/g, "")}`;
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCaptureRef = useRef(onCapture);
  const [preview, setPreview] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] =
    useState<CameraFacingMode>(preferredFacing);

  const mirrorPreview = facingMode === "user";

  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  useEffect(() => {
    setFacingMode(preferredFacing);
  }, [preferredFacing]);

  useEffect(() => {
    if (preview) return;

    let cancelled = false;
    let stream: MediaStream | null = null;

    async function start() {
      setStarting(true);
      setError(null);
      try {
        stream = await openCameraStream(facingMode);
        if (cancelled) return;

        const video = videoRef.current;
        if (!video || cancelled) return;

        await attachStreamToVideo(video, stream);
      } catch (e) {
        if (cancelled) return;
        const msg = cameraErrorMessage(e);
        if (msg) setError(msg);
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    void start();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };
  }, [preview, facingMode]);

  function captureFrame() {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (mirrorPreview) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);

    const stream = video.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    video.srcObject = null;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setPreview(url);
        onCaptureRef.current(blob);
      },
      "image/jpeg",
      0.92
    );
  }

  function retake() {
    if (preview) URL.revokeObjectURL(preview);
    setFacingMode(preferredFacing);
    setPreview(null);
  }

  function switchCamera() {
    setFacingMode((current) =>
      current === "user" ? "environment" : "user"
    );
  }

  const showLiveCamera = !preview && !starting && !error;

  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium text-surface">{label}</p>
        {hint && <p className="text-sm text-muted mt-0.5">{hint}</p>}
      </div>

      {instructions && instructions.length > 0 && (
        <ul className="text-sm text-muted space-y-1 list-disc pl-5">
          {instructions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}

      {error && (
        <div className="space-y-2">
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
          {onUsePhoneInstead && (
            <button
              type="button"
              onClick={onUsePhoneInstead}
              className="w-full text-sm font-medium text-accent hover:underline"
            >
              Scan QR with your phone instead
            </button>
          )}
        </div>
      )}

      <div className="relative aspect-[3/4] max-h-[420px] bg-black/90 rounded-xl overflow-hidden mx-auto w-full max-w-sm">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
            style={mirrorPreview ? { transform: "scaleX(-1)" } : undefined}
          />
        )}
        {showLiveCamera && (
          <button
            type="button"
            onClick={switchCamera}
            className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/60"
            aria-label="Switch camera"
          >
            <IconSwitchCamera className="h-5 w-5" />
          </button>
        )}
        {faceGuide && showLiveCamera && (
          <FaceOverlayGuide maskId={faceMaskId} />
        )}
        {starting && !preview && (
          <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
            Starting camera…
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-center">
        {preview ? (
          <button
            type="button"
            onClick={retake}
            className="px-5 py-2.5 rounded-lg border border-muted/40 text-surface text-sm font-medium hover:bg-muted/10"
          >
            Retake
          </button>
        ) : (
          <button
            type="button"
            onClick={captureFrame}
            disabled={starting || !!error}
            className="px-6 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
          >
            {captureLabel}
          </button>
        )}
      </div>
    </div>
  );
}
