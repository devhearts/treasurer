import fs from "fs";
import path from "path";

export const INTER_REGULAR = "Inter-Regular";
export const INTER_BOLD = "Inter-Bold";

function resolveFontPath(fileName: string): string {
  const candidates = [
    path.join(__dirname, "../../assets/fonts", fileName),
    path.join(__dirname, "../assets/fonts", fileName),
    path.join(process.cwd(), "src/assets/fonts", fileName),
    path.join(process.cwd(), "apps/api/src/assets/fonts", fileName),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Inter font not found: ${fileName}`);
}

export function registerInterFonts(doc: PDFKit.PDFDocument): void {
  doc.registerFont(INTER_REGULAR, resolveFontPath("Inter-Regular.ttf"));
  doc.registerFont(INTER_BOLD, resolveFontPath("Inter-Bold.ttf"));
}
