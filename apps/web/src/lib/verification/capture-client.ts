import { apiFetch } from "@/lib/api-client";
import type { PublicCaptureStatus } from "./types";

export async function fetchPublicCaptureStatus(
  token: string
): Promise<PublicCaptureStatus> {
  const res = await apiFetch(
    `public/verification/capture/${encodeURIComponent(token)}`
  );
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
  return data as PublicCaptureStatus;
}

export async function uploadPublicCaptureSlot(
  token: string,
  slot: "selfie" | "id-front" | "id-back",
  blob: Blob
): Promise<void> {
  const form = new FormData();
  form.append("file", blob, `${slot}.jpg`);
  const res = await apiFetch(
    `public/verification/capture/${encodeURIComponent(token)}/${slot}`,
    { method: "POST", body: form }
  );
  if (!res.ok) {
    const text = await res.text();
    let msg = text || res.statusText;
    try {
      const data = JSON.parse(text) as { message?: string };
      if (data.message) msg = data.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
}
