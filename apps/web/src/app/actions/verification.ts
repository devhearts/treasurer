"use server";

import { runServerAction } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";
import { serverApiFetch, serverApiJson } from "@/lib/server-api";
import type {
  CaptureSessionCreate,
  CaptureSessionPoll,
  VerificationStatus,
} from "@/lib/verification/types";

export async function getVerificationStatus(): Promise<VerificationStatus> {
  return serverApiJson<VerificationStatus>("verification/status");
}

export async function createCaptureSession(): Promise<
  ActionResult<CaptureSessionCreate>
> {
  return runServerAction(
    () =>
      serverApiJson<CaptureSessionCreate>("verification/capture-sessions", {
        method: "POST",
      }),
    "Could not start phone capture session.",
    "verification.capture-session"
  );
}

export async function pollCaptureSession(
  sessionId: string
): Promise<CaptureSessionPoll> {
  return serverApiJson<CaptureSessionPoll>(
    `verification/capture-sessions/${encodeURIComponent(sessionId)}`
  );
}

export async function submitVerificationWithSession(
  legalName: string,
  phone: string,
  captureSessionId: string
): Promise<ActionResult<{ ok: true }>> {
  return runServerAction(
    () =>
      serverApiJson<{ ok: true }>("verification/submit", {
        method: "POST",
        body: JSON.stringify({ legalName, phone, captureSessionId }),
      }),
    "Verification submission failed.",
    "verification.submit"
  );
}

export async function submitVerificationWithImages(
  legalName: string,
  phone: string,
  images: { selfie: Blob; idFront: Blob; idBack: Blob }
): Promise<ActionResult<{ ok: true }>> {
  return runServerAction(async () => {
    const form = new FormData();
    form.append("legalName", legalName);
    form.append("phone", phone);
    form.append("selfie", images.selfie, "selfie.jpg");
    form.append("idFront", images.idFront, "id-front.jpg");
    form.append("idBack", images.idBack, "id-back.jpg");
    const res = await serverApiFetch("verification/submit", {
      method: "POST",
      body: form,
    });
    const text = await res.text();
    const data = text ? (JSON.parse(text) as unknown) : null;
    if (!res.ok) {
      const msg =
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof (data as { message: unknown }).message === "string"
          ? (data as { message: string }).message
          : text || res.statusText;
      throw new Error(msg);
    }
    return data as { ok: true };
  }, "Verification submission failed.", "verification.submit");
}
