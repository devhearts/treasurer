import type { RenderContext } from "../render-utils";
import { svgClose, svgOpen } from "../render-utils";

/** Soft blobs + playful center stack. */
export function renderPastel(ctx: RenderContext): string {
  const { dims, palette, esc, ff, accent, field, defaultHeader } = ctx;
  const { w, h } = dims;
  const cx = w / 2;
  const n1 = esc(field(ctx.content, "name1") || "Name One");
  const n2 = esc(field(ctx.content, "name2"));
  const headline = esc(field(ctx.content, "headline") || "Celebration");
  const subtitle = esc(field(ctx.content, "subtitle"));
  const date = esc(field(ctx.content, "date"));
  const time = esc(field(ctx.content, "time"));
  const venue = esc(field(ctx.content, "venue"));
  const location = esc(field(ctx.content, "location"));
  const footer = esc(field(ctx.content, "footer"));
  const header = esc(defaultHeader);

  const subtitleBlock = subtitle
    ? `<text x="${cx}" y="${h * 0.32}" text-anchor="middle" font-family="${ff}" font-size="11" fill="${accent}" font-style="italic">${subtitle}</text>`
    : "";

  const name2Block =
    n2.trim() !== ""
      ? `<text x="${cx}" y="${h * 0.52}" text-anchor="middle" font-family="${ff}" font-size="18" fill="${palette.labelColor}">${n2}</text>`
      : "";

  return `${svgOpen(dims)}
  <rect width="${w}" height="${h}" rx="20" fill="${palette.bg}"/>
  <circle cx="${w * 0.2}" cy="${h * 0.15}" r="45" fill="${accent}" opacity="0.15"/>
  <circle cx="${w * 0.82}" cy="${h * 0.25}" r="55" fill="${accent}" opacity="0.1"/>
  <circle cx="${w * 0.75}" cy="${h * 0.85}" r="40" fill="${accent}" opacity="0.12"/>
  <text x="${cx}" y="${h * 0.18}" text-anchor="middle" font-family="${ff}" font-size="12" fill="${accent}" font-weight="600">${headline}</text>
  <text x="${cx}" y="${h * 0.24}" text-anchor="middle" font-family="${ff}" font-size="8" fill="${palette.labelColor}" opacity="0.75">${header}</text>
  ${subtitleBlock}
  <text x="${cx}" y="${h * 0.42}" text-anchor="middle" font-family="${ff}" font-size="22" fill="${palette.labelColor}" font-style="italic">${n1}</text>
  ${name2Block}
  <text x="${cx}" y="${h * 0.64}" text-anchor="middle" font-family="${ff}" font-size="10" fill="${palette.labelColor}" font-weight="bold">${date}</text>
  <text x="${cx}" y="${h * 0.7}" text-anchor="middle" font-family="${ff}" font-size="8" fill="${palette.labelColor}">${time}</text>
  <text x="${cx}" y="${h * 0.82}" text-anchor="middle" font-family="${ff}" font-size="9" fill="${accent}">${venue}</text>
  <text x="${cx}" y="${h * 0.88}" text-anchor="middle" font-family="${ff}" font-size="8" fill="${palette.labelColor}">${location}</text>
  <text x="${cx}" y="${h * 0.95}" text-anchor="middle" font-family="${ff}" font-size="8" fill="${palette.labelColor}" opacity="0.8">${footer}</text>
${svgClose()}`;
}
