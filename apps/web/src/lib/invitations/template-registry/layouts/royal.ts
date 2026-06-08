import type { RenderContext } from "../render-utils";
import { svgClose, svgOpen } from "../render-utils";

/** Ornate centered portrait — double rules, corner flourishes. */
export function renderRoyal(ctx: RenderContext): string {
  const { dims, palette, esc, ff, accent, field, defaultHeader } = ctx;
  const { w, h } = dims;
  const cx = w / 2;
  const n1 = esc(field(ctx.content, "name1") || "Name One");
  const n2 = esc(field(ctx.content, "name2"));
  const headline = esc((field(ctx.content, "headline") || "Celebration").toUpperCase());
  const date = esc(field(ctx.content, "date"));
  const time = esc(field(ctx.content, "time"));
  const venue = esc(field(ctx.content, "venue"));
  const location = esc(field(ctx.content, "location"));
  const footer = esc(field(ctx.content, "footer"));
  const header = esc(defaultHeader);
  const nfs = 26;
  const fs = 9;

  const name2Block =
    n2.trim() !== ""
      ? `<text x="${cx}" y="${h * 0.52}" text-anchor="middle" font-family="${ff}" font-size="${nfs * 0.85}" fill="${palette.labelColor}" font-style="italic">${n2}</text>
  <text x="${cx}" y="${h * 0.46}" text-anchor="middle" font-family="${ff}" font-size="${nfs * 0.45}" fill="${accent}">&amp;</text>`
      : "";

  const timeBlock = time
    ? `<text x="${cx}" y="${h * 0.78}" text-anchor="middle" font-family="${ff}" font-size="${fs}" fill="${palette.labelColor}" opacity="0.85">${time}</text>`
    : "";
  const locationBlock = location
    ? `<text x="${cx}" y="${h * 0.88}" text-anchor="middle" font-family="${ff}" font-size="${fs - 1}" fill="${accent}" opacity="0.85">${location}</text>`
    : "";

  return `${svgOpen(dims)}
  <rect width="${w}" height="${h}" rx="12" fill="${palette.bg}"/>
  <rect x="14" y="14" width="${w - 28}" height="${h - 28}" rx="6" fill="none" stroke="${accent}" stroke-width="1.2"/>
  <rect x="22" y="22" width="${w - 44}" height="${h - 44}" rx="4" fill="none" stroke="${accent}" stroke-width="0.5" opacity="0.5"/>
  <path d="M28 36 L${cx - 20} 36 M${cx + 20} 36 L${w - 28} 36" stroke="${accent}" stroke-width="0.6" fill="none"/>
  <circle cx="28" cy="36" r="2" fill="${accent}"/>
  <circle cx="${w - 28}" cy="36" r="2" fill="${accent}"/>
  <text x="${cx}" y="${h * 0.14}" text-anchor="middle" font-family="${ff}" font-size="${fs}" fill="${accent}" letter-spacing="3">${headline}</text>
  <text x="${cx}" y="${h * 0.2}" text-anchor="middle" font-family="${ff}" font-size="${fs - 1}" fill="${palette.labelColor}" opacity="0.8" letter-spacing="1">${header}</text>
  <line x1="${w * 0.25}" y1="${h * 0.24}" x2="${w * 0.75}" y2="${h * 0.24}" stroke="${accent}" stroke-width="0.5" opacity="0.5"/>
  <text x="${cx}" y="${h * 0.38}" text-anchor="middle" font-family="${ff}" font-size="${nfs}" fill="${palette.labelColor}" font-style="italic" font-weight="500">${n1}</text>
  ${name2Block}
  <line x1="${w * 0.2}" y1="${h * 0.58}" x2="${w * 0.8}" y2="${h * 0.58}" stroke="${accent}" stroke-width="0.7"/>
  <text x="${cx}" y="${h * 0.68}" text-anchor="middle" font-family="${ff}" font-size="${fs + 2}" fill="${palette.labelColor}" letter-spacing="2" font-weight="bold">${date}</text>
  ${timeBlock}
  <text x="${cx}" y="${h * 0.84}" text-anchor="middle" font-family="${ff}" font-size="${fs}" fill="${accent}" font-weight="600">${venue}</text>
  ${locationBlock}
  <line x1="${w * 0.2}" y1="${h * 0.92}" x2="${w * 0.8}" y2="${h * 0.92}" stroke="${accent}" stroke-width="0.4" opacity="0.4"/>
  <text x="${cx}" y="${h * 0.96}" text-anchor="middle" font-family="${ff}" font-size="${fs - 1}" fill="${palette.labelColor}" opacity="0.85">${footer}</text>
${svgClose()}`;
}
