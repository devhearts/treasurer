/** Browser upload to `/api/v1/events/image` with XMLHttpRequest progress events. */

export type EventImageUploadResult =
  | { success: true; key: string }
  | { success: false; error: string };

export function uploadEventImageWithProgress(
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<EventImageUploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/events/image");
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (!onProgress) return;
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
      } else {
        onProgress(50);
      }
    };

    xhr.onload = () => {
      const text = xhr.responseText?.trim() ?? "";
      let data: unknown = null;
      if (text) {
        try {
          data = JSON.parse(text) as unknown;
        } catch {
          /* ignore */
        }
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        const key =
          typeof data === "object" &&
          data !== null &&
          "key" in data &&
          typeof (data as { key: unknown }).key === "string"
            ? (data as { key: string }).key
            : "";
        if (!key) {
          resolve({ success: false, error: "Invalid upload response." });
          return;
        }
        onProgress?.(100);
        resolve({ success: true, key });
        return;
      }
      const msg =
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof (data as { message: unknown }).message === "string"
          ? (data as { message: string }).message
          : text || xhr.statusText || "Upload failed.";
      resolve({ success: false, error: msg });
    };

    xhr.onerror = () => {
      resolve({ success: false, error: "Upload failed." });
    };

    xhr.onabort = () => {
      resolve({ success: false, error: "Upload cancelled." });
    };

    xhr.send(formData);
  });
}
