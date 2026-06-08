import type { RenderContext } from "../render-utils";
import { svgClose } from "../render-utils";

const BG = "#FFFFFF";
const TEAL = "#48B5A3";
const PHOTO_FILL = "#E2E8F0";
const MUTED = "#94A3B8";
const SANS = "Montserrat, Helvetica, Arial, sans-serif";
const SCRIPT = "Georgia, cursive";

const CONFETTI = [
  [100, 50, 15, "#E88B6A"],
  [200, 30, 8, "#F4D03F"],
  [280, 60, 12, "#B5D596"],
  [380, 80, 18, "#E88B6A"],
  [450, 150, 10, TEAL],
  [450, 240, 15, "#B5D596"],
  [400, 320, 12, TEAL],
  [380, 370, 8, "#E88B6A"],
  [120, 360, 12, "#E88B6A"],
  [60, 270, 10, "#F4D03F"],
  [40, 200, 12, "#E88B6A"],
  [60, 140, 16, TEAL],
] as const;

const CONFETTI_ROW = [
  [90, 0, 3, "#E88B6A"],
  [110, -2, 2, TEAL],
  [130, 2, 2.5, "#F4D03F"],
  [150, 0, 3, "#E88B6A"],
  [170, -3, 2, TEAL],
  [190, 1, 2, "#E88B6A"],
  [210, 0, 3, "#F4D03F"],
  [230, 2, 2.5, TEAL],
  [250, -1, 3, "#E88B6A"],
  [270, 1, 2, TEAL],
  [290, 0, 2.5, "#F4D03F"],
  [310, -2, 3, "#E88B6A"],
  [330, 2, 2, TEAL],
  [350, 0, 2.5, "#E88B6A"],
  [370, -1, 2, TEAL],
  [390, 1, 3, "#F4D03F"],
  [410, 0, 2.5, "#E88B6A"],
] as const;

function confettiCircles(accent: string): string {
  return CONFETTI.map(([cx, cy, r, fill]) => {
    const c = fill === TEAL ? accent : fill;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/>`;
  }).join("\n  ");
}

function confettiRow(accent: string): string {
  const dots = CONFETTI_ROW.map(([cx, dy, r, fill]) => {
    const c = fill === TEAL ? accent : fill;
    return `<circle cx="${cx}" cy="${dy}" r="${r}" fill="${c}"/>`;
  }).join("\n    ");
  return `<g transform="translate(0, 570)">\n    ${dots}\n  </g>`;
}

/** White confetti party card — large photo, script name (500×700). */
export function renderCelebrate(ctx: RenderContext): string {
  const { esc, field, defaultHeader, accent: accentIn } = ctx;
  const vbW = 500;
  const vbH = 700;
  const accent = accentIn || TEAL;
  const sizeAttrs = ctx.dims.responsive
    ? `width="100%" height="100%" viewBox="0 0 ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet"`
    : `width="${ctx.dims.w}" height="${ctx.dims.h}" viewBox="0 0 ${vbW} ${vbH}"`;

  const headline = esc(
    (field(ctx.content, "headline")?.trim() || defaultHeader).toUpperCase()
  );
  const name = esc(field(ctx.content, "name1") || "Name");
  const eventTitle = esc(
    (field(ctx.content, "tagline") || field(ctx.content, "subtitle") || "")
      .toUpperCase()
  );
  const date = esc(field(ctx.content, "date"));
  const time = esc(field(ctx.content, "time"));
  const whenLine = esc(
    [date, time].filter(Boolean).join(" ") || date || time
  );
  const loc = esc(
    [field(ctx.content, "venue"), field(ctx.content, "location")]
      .filter(Boolean)
      .join(", ")
  );
  const rsvpLine = esc(
    field(ctx.content, "footer") ||
      (field(ctx.content, "hostLine")
        ? `RSVP TO ${field(ctx.content, "hostLine")}`
        : "")
  );

  const photoHref = ctx.photoHref?.trim();
  const photoDefs = photoHref
    ? `<defs><clipPath id="celebratePhotoClip"><circle cx="250" cy="220" r="140"/></clipPath></defs>`
    : "";
  const photoImage = photoHref
    ? `<image id="invitePhoto" href="${esc(photoHref)}" x="110" y="80" width="280" height="280" clip-path="url(#celebratePhotoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : "";
  const photoPlaceholder = photoHref
    ? ""
    : `<text x="250" y="225" font-family="${SANS}" font-size="14" fill="${MUTED}" text-anchor="middle">Add a photo</text>`;

  const titleBlock = eventTitle
    ? `<text x="250" y="540" font-family="${SANS}" font-size="22" fill="${accent}" text-anchor="middle" font-weight="bold" letter-spacing="4">${eventTitle}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${vbW} ${vbH}" ${sizeAttrs}>
  ${photoDefs}
  <rect width="${vbW}" height="${vbH}" fill="${BG}"/>

  ${confettiCircles(accent)}

  <circle cx="250" cy="220" r="140" fill="${PHOTO_FILL}"/>
  ${photoImage}
  ${photoPlaceholder}

  <text x="250" y="420" font-family="${SANS}" font-size="14" fill="${accent}" text-anchor="middle" font-weight="bold" letter-spacing="2">${headline}</text>
  <text x="250" y="490" font-family="${SCRIPT}" font-size="56" fill="${accent}" text-anchor="middle">${name}</text>
  ${titleBlock}

  ${confettiRow(accent)}

  <text x="250" y="610" font-family="${SANS}" font-size="12" fill="${accent}" text-anchor="middle" letter-spacing="1">${whenLine}</text>
  <text x="250" y="635" font-family="${SANS}" font-size="12" fill="${accent}" text-anchor="middle" letter-spacing="1">${loc}</text>
  <text x="250" y="660" font-family="${SANS}" font-size="12" fill="${accent}" text-anchor="middle" letter-spacing="1">${rsvpLine}</text>
${svgClose()}`;
}
