import type { RenderContext } from "../render-utils";
import { svgClose, svgOpen } from "../render-utils";

/** Bold top banner + oversized names (3:4). */
export function renderPop(ctx: RenderContext): string {
  const { dims, palette, esc, ff, accent, field, defaultHeader } = ctx;
  const { w, h } = dims;
  const cx = w / 2;
  const n1 = esc(field(ctx.content, "name1") || "Name One");
  const n2 = esc(field(ctx.content, "name2"));
  const headline = esc((field(ctx.content, "headline") || "Celebration").toUpperCase());
  const tagline = esc(field(ctx.content, "tagline") || defaultHeader);
  const date = esc(field(ctx.content, "date"));
  const time = esc(field(ctx.content, "time"));
  const venue = esc(field(ctx.content, "venue"));
  const location = esc(field(ctx.content, "location"));
  const footer = esc(field(ctx.content, "footer"));
  const bannerH = h * 0.22;

  const name2Block =
    n2.trim() !== ""
      ? `<text x="${cx}" y="${h * 0.58}" text-anchor="middle" font-family="${ff}" font-size="22" fill="#fff" font-weight="bold">${n2}</text>`
      : "";

  return `${svgOpen(dims)}
  <rect width="${w}" height="${h}" fill="${palette.bg}"/>
  <rect width="${w}" height="${bannerH}" fill="${accent}"/>
  <text x="${cx}" y="${bannerH * 0.45}" text-anchor="middle" font-family="${ff}" font-size="11" fill="${palette.bg}" font-weight="bold" letter-spacing="2">${headline}</text>
  <text x="${cx}" y="${bannerH * 0.78}" text-anchor="middle" font-family="${ff}" font-size="8" fill="${palette.bg}" opacity="0.9">${tagline}</text>
  <text x="${cx}" y="${h * 0.48}" text-anchor="middle" font-family="${ff}" font-size="28" fill="${palette.labelColor}" font-weight="bold">${n1}</text>
  ${name2Block}
  <rect x="24" y="${h * 0.64}" width="${w - 48}" height="2" fill="${accent}"/>
  <text x="${cx}" y="${h * 0.72}" text-anchor="middle" font-family="${ff}" font-size="11" fill="${palette.labelColor}" letter-spacing="1">${date}</text>
  <text x="${cx}" y="${h * 0.78}" text-anchor="middle" font-family="${ff}" font-size="9" fill="${palette.labelColor}" opacity="0.85">${time}</text>
  <text x="${cx}" y="${h * 0.86}" text-anchor="middle" font-family="${ff}" font-size="10" fill="${accent}" font-weight="600">${venue}</text>
  <text x="${cx}" y="${h * 0.92}" text-anchor="middle" font-family="${ff}" font-size="8" fill="${palette.labelColor}">${location}</text>
  <text x="${cx}" y="${h * 0.97}" text-anchor="middle" font-family="${ff}" font-size="8" fill="${palette.labelColor}" opacity="0.7">${footer}</text>
${svgClose()}`;
}
