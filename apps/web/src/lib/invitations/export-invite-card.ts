import type { InviteCardContent, InviteTemplateId } from "./types";
import { renderInviteCardSvg } from "./render-invite-card";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadInviteSvg(
  templateId: InviteTemplateId,
  content: InviteCardContent,
  filename = "invitation.svg"
) {
  const svg = renderInviteCardSvg(templateId, content);
  downloadBlob(new Blob([svg], { type: "image/svg+xml" }), filename);
}

export async function downloadInvitePng(
  templateId: InviteTemplateId,
  content: InviteCardContent,
  filename = "invitation.png"
): Promise<void> {
  const svg = renderInviteCardSvg(templateId, content, { width: 400, height: 560 });
  const scale = 2;
  const w = 400 * scale;
  const h = 560 * scale;
  const img = new Image();
  const url = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
  );
  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (blob) downloadBlob(blob, filename);
          resolve();
        }, "image/png");
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to render PNG"));
    };
    img.src = url;
  });
}

export async function downloadInvitePdf(
  templateId: InviteTemplateId,
  content: InviteCardContent,
  filename = "invitation.pdf"
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    const svg = renderInviteCardSvg(templateId, content, { width: 400, height: 560 });
    const img = new Image();
    const url = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
    );
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 1120;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 800, 1120);
      ctx.drawImage(img, 0, 0, 800, 1120);
      canvas.toBlob((b) => {
        URL.revokeObjectURL(url);
        if (b) resolve(b);
        else reject(new Error("PNG export failed"));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to render PDF source"));
    };
    img.src = url;
  });

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(pngBlob);
  });

  const pdfW = 105;
  const pdfH = (105 * 560) / 400;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pdfW, pdfH],
  });
  doc.addImage(dataUrl, "PNG", 0, 0, pdfW, pdfH);
  doc.save(filename);
}
