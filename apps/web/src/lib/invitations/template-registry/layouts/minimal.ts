import type { RenderContext } from "../render-utils";
import { svgClose, svgOpen } from "../render-utils";

/** Left rail typographic grid (square). */
export function renderMinimal(ctx: RenderContext): string {
  const { dims, palette, esc, ff, accent, field, defaultHeader } = ctx;
  const { w, h } = dims;
  const pad = 24;
  const railW = 4;
  const textX = pad + railW + 16;
  const n1 = esc(field(ctx.content, "name1") || "Name One");
  const n2 = esc(field(ctx.content, "name2"));
  const headline = esc(field(ctx.content, "headline") || "Celebration");
  const hostLine = esc(field(ctx.content, "hostLine") || defaultHeader);
  const date = esc(field(ctx.content, "date"));
  const time = esc(field(ctx.content, "time"));
  const venue = esc(field(ctx.content, "venue"));
  const location = esc(field(ctx.content, "location"));
  const footer = esc(field(ctx.content, "footer"));

  const name2Block =
    n2.trim() !== ""
      ? `<text x="${textX}" y="168" font-family="${ff}" font-size="18" fill="${palette.labelColor}">${n2}</text>`
      : "";

  return `${svgOpen(dims)}
  <rect width="${w}" height="${h}" fill="${palette.bg}"/>
  <rect x="${pad}" y="${pad}" width="${railW}" height="${h - pad * 2}" fill="${accent}"/>
  <text x="${textX}" y="52" font-family="${ff}" font-size="9" fill="${accent}" letter-spacing="2">${headline.toUpperCase()}</text>
  <text x="${textX}" y="72" font-family="${ff}" font-size="8" fill="${palette.labelColor}" opacity="0.65">${hostLine}</text>
  <text x="${textX}" y="130" font-family="${ff}" font-size="26" fill="${palette.labelColor}" font-weight="500">${n1}</text>
  ${name2Block}
  <line x1="${textX}" y1="200" x2="${w - pad}" y2="200" stroke="${palette.labelColor}" stroke-width="0.5" opacity="0.3"/>
  <text x="${textX}" y="228" font-family="${ff}" font-size="11" fill="${palette.labelColor}" font-weight="bold">${date}</text>
  <text x="${textX}" y="248" font-family="${ff}" font-size="9" fill="${palette.labelColor}">${time}</text>
  <text x="${textX}" y="290" font-family="${ff}" font-size="10" fill="${accent}">${venue}</text>
  <text x="${textX}" y="308" font-family="${ff}" font-size="8" fill="${palette.labelColor}" opacity="0.8">${location}</text>
  <text x="${textX}" y="${h - pad}" font-family="${ff}" font-size="8" fill="${palette.labelColor}" opacity="0.7">${footer}</text>
${svgClose()}`;
}
