import type { RenderContext } from "../render-utils";
import { svgClose, svgOpen } from "../render-utils";

/** Corner brackets + wide mono grid (16:9). */
export function renderCyber(ctx: RenderContext): string {
  const { dims, palette, esc, ff, accent, field, defaultHeader } = ctx;
  const { w, h } = dims;
  const cx = w / 2;
  const m = 20;
  const n1 = esc(field(ctx.content, "name1") || "Name One");
  const n2 = esc(field(ctx.content, "name2"));
  const headline = esc((field(ctx.content, "headline") || "Celebration").toUpperCase());
  const tagline = esc(field(ctx.content, "tagline") || defaultHeader);
  const hostLine = esc(field(ctx.content, "hostLine"));
  const date = esc(field(ctx.content, "date"));
  const time = esc(field(ctx.content, "time"));
  const venue = esc(field(ctx.content, "venue"));
  const location = esc(field(ctx.content, "location"));
  const footer = esc(field(ctx.content, "footer"));
  const mono = "Courier New, monospace";

  const hostBlock = hostLine
    ? `<text x="${cx}" y="${h * 0.62}" text-anchor="middle" font-family="${mono}" font-size="8" fill="${accent}" opacity="0.9">${hostLine}</text>`
    : "";

  const name2Block =
    n2.trim() !== ""
      ? `<text x="${cx}" y="${h * 0.48}" text-anchor="middle" font-family="${mono}" font-size="14" fill="${palette.labelColor}">${n2}</text>`
      : "";

  const bracket = (x1: number, y1: number, x2: number, y2: number) =>
    `<path d="M${x1} ${y1 + 12} L${x1} ${y1} L${x1 + 12} ${y1} M${x2 - 12} ${y1} L${x2} ${y1} L${x2} ${y1 + 12} M${x2} ${y2 - 12} L${x2} ${y2} L${x2 - 12} ${y2} M${x1 + 12} ${y2} L${x1} ${y2} L${x1} ${y2 - 12}" fill="none" stroke="${accent}" stroke-width="1.5"/>`;

  return `${svgOpen(dims)}
  <rect width="${w}" height="${h}" fill="${palette.bg}"/>
  ${bracket(m, m, w - m, h - m)}
  <line x1="${m}" y1="${h * 0.35}" x2="${w - m}" y2="${h * 0.35}" stroke="${accent}" stroke-width="0.5" opacity="0.4"/>
  <text x="${m + 8}" y="${h * 0.22}" font-family="${mono}" font-size="9" fill="${accent}" letter-spacing="2">${headline}</text>
  <text x="${w - m - 8}" y="${h * 0.22}" text-anchor="end" font-family="${mono}" font-size="7" fill="${palette.labelColor}" opacity="0.7">${tagline}</text>
  <text x="${cx}" y="${h * 0.42}" text-anchor="middle" font-family="${ff}" font-size="20" fill="${palette.labelColor}" font-weight="bold">${n1}</text>
  ${name2Block}
  <text x="${cx}" y="${h * 0.54}" text-anchor="middle" font-family="${mono}" font-size="10" fill="${accent}">// ${date}</text>
  ${hostBlock}
  <text x="${cx}" y="${h * 0.72}" text-anchor="middle" font-family="${mono}" font-size="8" fill="${palette.labelColor}">${time} · ${venue}</text>
  <text x="${cx}" y="${h * 0.8}" text-anchor="middle" font-family="${mono}" font-size="7" fill="${palette.labelColor}" opacity="0.8">${location}</text>
  <text x="${cx}" y="${h * 0.9}" text-anchor="middle" font-family="${mono}" font-size="7" fill="${palette.labelColor}" opacity="0.6">${footer}</text>
${svgClose()}`;
}
