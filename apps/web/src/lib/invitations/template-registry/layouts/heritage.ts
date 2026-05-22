import type { RenderContext } from "../render-utils";
import { svgClose } from "../render-utils";

const BG = "#F9F6EB";
const INK = "#332211";
const MUTED = "#A89986";
const PHOTO_FILL = "#EAE5D9";
const SERIF = "Georgia, 'Playfair Display', 'Times New Roman', serif";
const SCRIPT = "Georgia, cursive";
const SANS = "Montserrat, Helvetica, Arial, sans-serif";

function cornerFlourish(accent: string): string {
  return `<g>
    <path d="M 0,40 L 40,0" stroke="${accent}" stroke-width="2" fill="none"/>
    <circle cx="15" cy="15" r="5" fill="none" stroke="${accent}" stroke-width="2"/>
    <path d="M 0,60 C 20,60 40,40 40,20" stroke="${accent}" stroke-width="2" fill="none"/>
  </g>`;
}

/** Cream heritage frame, dashed photo, date banner (500×700). */
export function renderHeritage(ctx: RenderContext): string {
  const { esc, field, defaultHeader, accent: accentIn } = ctx;
  const vbW = 500;
  const vbH = 700;
  const accent = accentIn || "#B89966";
  const ink = INK;
  const sizeAttrs = ctx.dims.responsive
    ? `width="100%" height="100%" viewBox="0 0 ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet"`
    : `width="${ctx.dims.w}" height="${ctx.dims.h}" viewBox="0 0 ${vbW} ${vbH}"`;

  const headline = esc(
    (field(ctx.content, "headline")?.trim() || defaultHeader).toUpperCase()
  );
  const name = esc(field(ctx.content, "name1") || "Name");
  const lifeBanner = esc(field(ctx.content, "subtitle"));
  const serviceTitle = esc(
    (field(ctx.content, "tagline") || "Service").toUpperCase()
  );
  const date = esc(field(ctx.content, "date"));
  const time = esc(field(ctx.content, "time"));
  const whenLine = esc(
    [date, time].filter(Boolean).join(" | ") || date || time
  );
  const loc = esc(
    [field(ctx.content, "venue"), field(ctx.content, "location")]
      .filter(Boolean)
      .join(", ")
  );
  const rsvpName = esc(field(ctx.content, "hostLine"));
  const footerRaw = field(ctx.content, "footer");
  const footerLines = footerRaw
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const photoHref = ctx.photoHref?.trim();
  const photoDefs = photoHref
    ? `<defs><clipPath id="heritagePhotoClip"><circle cx="250" cy="170" r="75"/></clipPath></defs>`
    : "";
  const photoImage = photoHref
    ? `<image id="invitePhoto" href="${esc(photoHref)}" x="175" y="95" width="150" height="150" clip-path="url(#heritagePhotoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : "";
  const photoPlaceholder = photoHref
    ? ""
    : `<text x="250" y="175" font-family="${SANS}" font-size="12" fill="${MUTED}" text-anchor="middle">Add a photo</text>`;

  const bannerBlock = lifeBanner
    ? `<rect x="50" y="400" width="400" height="30" fill="${accent}"/>
  <text x="250" y="421" font-family="${SANS}" font-size="14" fill="${ink}" text-anchor="middle" font-weight="bold" letter-spacing="1">${lifeBanner}</text>`
    : "";

  const rsvpLines = (() => {
    const lines: string[] = [];
    let y = 590;
    if (rsvpName || footerLines.length) {
      lines.push(
        `<text x="250" y="570" font-family="${SERIF}" font-size="14" fill="${ink}" text-anchor="middle">RSVP</text>`
      );
    }
    if (rsvpName) {
      lines.push(
        `<text x="250" y="${y}" font-family="${SERIF}" font-size="14" fill="${ink}" text-anchor="middle">${rsvpName}</text>`
      );
      y += 20;
    }
    for (const line of footerLines.slice(0, 3)) {
      lines.push(
        `<text x="250" y="${y}" font-family="${SERIF}" font-size="14" fill="${ink}" text-anchor="middle">${esc(line)}</text>`
      );
      y += 20;
    }
    return lines.join("\n  ");
  })();

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${vbW} ${vbH}" ${sizeAttrs}>
  ${photoDefs}
  <rect width="${vbW}" height="${vbH}" fill="${BG}"/>
  <rect x="25" y="25" width="450" height="650" fill="none" stroke="${accent}" stroke-width="2"/>
  <ellipse cx="250" cy="350" rx="200" ry="320" fill="none" stroke="${accent}" stroke-width="2"/>

  <g transform="translate(25, 25)">${cornerFlourish(accent)}</g>
  <g transform="translate(475, 25) scale(-1, 1)">${cornerFlourish(accent)}</g>
  <g transform="translate(25, 675) scale(1, -1)">${cornerFlourish(accent)}</g>
  <g transform="translate(475, 675) scale(-1, -1)">${cornerFlourish(accent)}</g>

  <circle cx="250" cy="170" r="85" fill="none" stroke="${accent}" stroke-width="6" stroke-dasharray="8,6"/>
  <circle cx="250" cy="170" r="75" fill="${PHOTO_FILL}"/>
  ${photoImage}
  ${photoPlaceholder}

  <text x="250" y="290" font-family="${SERIF}" font-size="16" fill="${ink}" text-anchor="middle" font-weight="bold" letter-spacing="2">${headline}</text>
  <text x="250" y="370" font-family="${SCRIPT}" font-size="64" fill="#6B553A" text-anchor="middle">${name}</text>

  ${bannerBlock}

  <text x="250" y="470" font-family="${SERIF}" font-size="16" fill="${ink}" text-anchor="middle" font-weight="bold" letter-spacing="2">${serviceTitle}</text>
  <text x="250" y="495" font-family="${SERIF}" font-size="14" fill="${ink}" text-anchor="middle">${whenLine}</text>
  <text x="250" y="520" font-family="${SERIF}" font-size="14" fill="${ink}" text-anchor="middle">${loc}</text>

  ${rsvpLines}
${svgClose()}`;
}
