import type { InviteCardContent, InviteTemplateId } from "./types";
import { renderInviteCardSvg } from "./render-invite-card";
import { getInviteTemplate } from "./template-registry";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportDimensions(templateId: InviteTemplateId | string) {
  const { width, height } = getInviteTemplate(templateId).format;
  const scale = 2;
  return { width, height, w: width * scale, h: height * scale };
}

export function downloadInviteSvg(
  templateId: InviteTemplateId | string,
  content: InviteCardContent,
  filename = "invitation.svg"
) {
  const svg = renderInviteCardSvg(templateId, content);
  downloadBlob(new Blob([svg], { type: "image/svg+xml" }), filename);
}

export async function downloadInvitePng(
  templateId: InviteTemplateId | string,
  content: InviteCardContent,
  filename = "invitation.png"
): Promise<void> {
  const { width, height, w, h } = exportDimensions(templateId);
  const svg = renderInviteCardSvg(templateId, content, { width, height });
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
  templateId: InviteTemplateId | string,
  content: InviteCardContent,
  filename = "invitation.pdf"
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { width, height, w, h } = exportDimensions(templateId);
  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    const svg = renderInviteCardSvg(templateId, content, { width, height });
    const img = new Image();
    const url = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
    );
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
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
  const pdfH = (105 * height) / width;
  const doc = new jsPDF({
    orientation: pdfH > pdfW ? "portrait" : "landscape",
    unit: "mm",
    format: [pdfW, pdfH],
  });
  doc.addImage(dataUrl, "PNG", 0, 0, pdfW, pdfH);
  doc.save(filename);
}
