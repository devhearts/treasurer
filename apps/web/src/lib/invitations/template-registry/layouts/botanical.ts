import type { RenderContext } from "../render-utils";
import { svgClose, svgOpen } from "../render-utils";

/** Top botanical band + soft centered stack. */
export function renderBotanical(ctx: RenderContext): string {
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
  const bandH = h * 0.14;

  const subtitleBlock = subtitle
    ? `<text x="${cx}" y="${h * 0.36}" text-anchor="middle" font-family="${ff}" font-size="10" fill="${palette.labelColor}" opacity="0.75" font-style="italic">${subtitle}</text>`
    : "";

  const name2Block =
    n2.trim() !== ""
      ? `<text x="${cx}" y="${h * 0.54}" text-anchor="middle" font-family="${ff}" font-size="20" fill="${palette.labelColor}" font-style="italic">${n2}</text>`
      : "";

  const timeBlock = time
    ? `<text x="${cx}" y="${h * 0.76}" text-anchor="middle" font-family="${ff}" font-size="9" fill="${palette.labelColor}">${time}</text>`
    : "";

  return `${svgOpen(dims)}
  <rect width="${w}" height="${h}" rx="12" fill="${palette.bg}"/>
  <rect width="${w}" height="${bandH}" rx="12" fill="${accent}" opacity="0.12"/>
  <ellipse cx="${w * 0.15}" cy="${bandH * 0.5}" rx="28" ry="18" fill="${accent}" opacity="0.2"/>
  <ellipse cx="${w * 0.85}" cy="${bandH * 0.55}" rx="32" ry="20" fill="${accent}" opacity="0.15"/>
  <path d="M${w * 0.1} ${bandH} Q${cx} ${bandH - 8} ${w * 0.9} ${bandH}" fill="none" stroke="${accent}" stroke-width="1" opacity="0.4"/>
  <text x="${cx}" y="${bandH * 0.55}" text-anchor="middle" font-family="${ff}" font-size="11" fill="${accent}" letter-spacing="1">${headline}</text>
  <text x="${cx}" y="${h * 0.22}" text-anchor="middle" font-family="${ff}" font-size="8" fill="${palette.labelColor}" opacity="0.7">${header}</text>
  ${subtitleBlock}
  <text x="${cx}" y="${h * 0.44}" text-anchor="middle" font-family="${ff}" font-size="24" fill="${palette.labelColor}" font-style="italic">${n1}</text>
  ${name2Block}
  <text x="${cx}" y="${h * 0.66}" text-anchor="middle" font-family="${ff}" font-size="10" fill="${palette.labelColor}" letter-spacing="1.5" font-weight="600">${date}</text>
  ${timeBlock}
  <text x="${cx}" y="${h * 0.84}" text-anchor="middle" font-family="${ff}" font-size="9" fill="${accent}" font-weight="600">${venue}</text>
  <text x="${cx}" y="${h * 0.9}" text-anchor="middle" font-family="${ff}" font-size="8" fill="${palette.labelColor}" opacity="0.8">${location}</text>
  <text x="${cx}" y="${h * 0.96}" text-anchor="middle" font-family="${ff}" font-size="8" fill="${palette.labelColor}" opacity="0.75">${footer}</text>
${svgClose()}`;
}
