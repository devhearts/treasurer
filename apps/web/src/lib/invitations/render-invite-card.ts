import type { InviteCardContent, InviteTemplateId } from "./types";
import { getTemplateMeta } from "./templates";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fontFamily(font: InviteCardContent["font"]): string {
  switch (font) {
    case "monospace":
      return "Courier New, monospace";
    case "sans-serif":
      return "Helvetica, Arial, sans-serif";
    case "script":
      return "Georgia, cursive";
    default:
      return "Georgia, serif";
  }
}

const HEADER: Record<InviteTemplateId, string> = {
  royal: "THE PLEASURE OF YOUR COMPANY IS REQUESTED",
  botanical: "please join us to celebrate",
  pop: "YOU ARE INVITED TO CELEBRATE!",
  minimal: "you are invited",
  pastel: "come celebrate with us",
  cyber: "YOU HAVE BEEN SELECTED TO ATTEND",
};

export function renderInviteCardSvg(
  templateId: InviteTemplateId,
  content: InviteCardContent,
  opts?: { width?: number; height?: number; responsive?: boolean }
): string {
  const w = opts?.width ?? 400;
  const h = opts?.height ?? 560;
  const sizeAttrs = opts?.responsive
    ? 'width="100%" height="100%" preserveAspectRatio="xMidYMid meet"'
    : `width="${w}" height="${h}"`;
  const t = getTemplateMeta(templateId);
  const ff = fontFamily(content.font);
  const n1 = esc(content.name1 || "Name One");
  const n2 = esc(content.name2 || "");
  const headline = esc((content.headline || "Celebration").toUpperCase());
  const date = esc(content.date || "");
  const time = esc(content.time || "");
  const venue = esc(content.venue || "");
  const location = esc(content.location || "");
  const footer = esc(content.footer || "");
  const accent = content.accentColor || t.accent;
  const header = HEADER[templateId];
  const cx = w / 2;
  const isMinimal = templateId === "minimal";
  const startX = isMinimal ? 28 : cx;
  const ta = isMinimal ? "start" : "middle";
  const nfs = templateId === "pop" ? 28 : templateId === "minimal" ? 30 : 26;
  const fs = 9;

  const name2Block =
    n2.trim() !== ""
      ? `<text x="${startX}" y="${h * 0.55}" text-anchor="${ta}" font-family="${ff}" font-size="${nfs * 0.85}" fill="${t.labelColor}" font-style="italic">${n2}</text>
    <text x="${startX}" y="${h * 0.48}" text-anchor="${ta}" font-family="${ff}" font-size="${nfs * 0.5}" fill="${accent}" opacity="0.7">&amp;</text>`
      : "";

  const timeBlock = time
    ? `<text x="${startX}" y="${h * 0.82}" text-anchor="${ta}" font-family="${ff}" font-size="${fs}" fill="${t.labelColor}" opacity="0.85">${time}</text>`
    : "";

  const locationBlock = location
    ? `<text x="${startX}" y="${h * 0.9}" text-anchor="${ta}" font-family="${ff}" font-size="${fs - 1}" fill="${accent}" opacity="0.8">${location}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ${sizeAttrs}>
  <rect width="${w}" height="${h}" rx="12" fill="${t.bg}"/>
  <rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="8" fill="none" stroke="${accent}" stroke-width="0.8" stroke-dasharray="4,3" opacity="0.7"/>
  <text x="${startX}" y="${h * 0.18}" text-anchor="${ta}" font-family="${ff}" font-size="${fs}" fill="${accent}" letter-spacing="2">${headline}</text>
  <text x="${startX}" y="${h * 0.26}" text-anchor="${ta}" font-family="${ff}" font-size="${fs - 1}" fill="${t.labelColor}" opacity="0.75" letter-spacing="1">${esc(header)}</text>
  <text x="${startX}" y="${h * 0.42}" text-anchor="${ta}" font-family="${ff}" font-size="${nfs}" fill="${t.labelColor}" font-style="italic" font-weight="500">${n1}</text>
  ${name2Block}
  <line x1="${isMinimal ? 28 : w * 0.2}" y1="${h * 0.62}" x2="${isMinimal ? w - 28 : w * 0.8}" y2="${h * 0.62}" stroke="${accent}" stroke-width="0.6" opacity="0.6"/>
  <text x="${startX}" y="${h * 0.72}" text-anchor="${ta}" font-family="${ff}" font-size="${fs + 1}" fill="${t.labelColor}" letter-spacing="2" font-weight="bold">${date}</text>
  ${timeBlock}
  <text x="${startX}" y="${h * 0.86}" text-anchor="${ta}" font-family="${ff}" font-size="${fs}" fill="${accent}" font-weight="600">${venue}</text>
  ${locationBlock}
  <line x1="${isMinimal ? 28 : w * 0.2}" y1="${h * 0.93}" x2="${isMinimal ? w - 28 : w * 0.8}" y2="${h * 0.93}" stroke="${accent}" stroke-width="0.5" opacity="0.4"/>
  <text x="${startX}" y="${h * 0.97}" text-anchor="${ta}" font-family="${ff}" font-size="${fs - 1}" fill="${t.labelColor}" opacity="0.8">${footer}</text>
</svg>`;
}
