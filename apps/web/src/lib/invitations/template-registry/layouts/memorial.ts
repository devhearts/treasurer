import type { RenderContext } from "../render-utils";
import { svgClose } from "../render-utils";

const GOLD = "#D4AF37";
const BG = "#2A2A2A";
const SCRIPT = "Georgia, 'Times New Roman', serif";
const SANS = "Montserrat, Helvetica, Arial, sans-serif";

/** Memorial card — gold frame, photo wreath, life dates (500×700 viewBox). */
export function renderMemorial(ctx: RenderContext): string {
  const { dims, esc, field, defaultHeader } = ctx;
  const vbW = 500;
  const vbH = 700;
  const sizeAttrs = dims.responsive
    ? `width="100%" height="100%" viewBox="0 0 ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet"`
    : `width="${dims.w}" height="${dims.h}" viewBox="0 0 ${vbW} ${vbH}"`;

  const header = esc(
    field(ctx.content, "headline")?.trim() || defaultHeader
  );
  const name = esc(
    field(ctx.content, "honoree")?.trim() ||
      field(ctx.content, "name1") ||
      "Name"
  );
  const birth = esc(field(ctx.content, "subtitle"));
  const passing = esc(field(ctx.content, "tagline"));
  const serviceDate = esc(field(ctx.content, "date"));
  const venue = esc(field(ctx.content, "venue"));
  const locRaw = field(ctx.content, "location");
  const locParts = locRaw
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const loc1 = esc(locParts[0] ?? locRaw);
  const loc2 = esc(locParts[1] ?? "");
  const accent = ctx.accent || GOLD;

  const birthBlock = birth
    ? `<text x="170" y="480" font-family="${SANS}" font-size="16" fill="#FFFFFF" text-anchor="middle">${birth}</text>`
    : "";
  const passingBlock = passing
    ? `<text x="330" y="480" font-family="${SANS}" font-size="16" fill="#FFFFFF" text-anchor="middle">${passing}</text>`
    : "";
  const datesDivider =
    birth || passing
      ? `<line x1="120" y1="510" x2="220" y2="510" stroke="${accent}" stroke-width="1.5"/>
  <circle cx="250" cy="510" r="10" fill="none" stroke="${accent}" stroke-width="1.5"/>
  <circle cx="230" cy="510" r="4" fill="none" stroke="${accent}" stroke-width="1.5"/>
  <circle cx="270" cy="510" r="4" fill="none" stroke="${accent}" stroke-width="1.5"/>
  <line x1="280" y1="510" x2="380" y2="510" stroke="${accent}" stroke-width="1.5"/>`
      : "";

  const loc2Block = loc2
    ? `<text x="250" y="645" font-family="${SANS}" font-size="13" fill="#DDDDDD" text-anchor="middle">${loc2}</text>`
    : "";

  const branch = `<path d="M -30,0 L 50,0 M -20,0 L -30,-10 M -10,0 L -20,-15 M 0,0 L -10,-20 M 10,0 L 0,-25 M 20,0 L 10,-20" stroke="${accent}" stroke-width="2" fill="none"/>`;

  const photoHref = ctx.photoHref?.trim();
  const photoDefs = photoHref
    ? `<defs><clipPath id="photoClip"><circle cx="250" cy="270" r="88"/></clipPath></defs>`
    : "";
  const photoImage = photoHref
    ? `<image id="invitePhoto" href="${esc(photoHref)}" x="162" y="182" width="176" height="176" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>`
    : "";
  const photoPlaceholder = photoHref
    ? ""
    : `<text x="250" y="274" font-family="${SANS}" font-size="11" fill="#888888" text-anchor="middle">Add a photo</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${vbW} ${vbH}" ${sizeAttrs}>
  ${photoDefs}
  <rect width="${vbW}" height="${vbH}" fill="${BG}"/>
  <rect x="20" y="20" width="460" height="660" fill="none" stroke="${accent}" stroke-width="2"/>
  <rect x="30" y="30" width="440" height="640" fill="none" stroke="${accent}" stroke-width="1"/>

  <text x="250" y="100" font-family="${SCRIPT}" font-size="42" fill="${accent}" text-anchor="middle" font-weight="bold" font-style="italic">${header}</text>

  ${photoImage}
  <g transform="translate(250, 270)">
    <circle cx="0" cy="0" r="90" fill="#444444" stroke="${accent}" stroke-width="2" opacity="${photoHref ? "0.35" : "1"}"/>
    <path d="M -90,0 A 90 90 0 0 1 0,-90" fill="none" stroke="${accent}" stroke-width="3"/>
    <path d="M 0,90 A 90 90 0 0 1 -90,0" fill="none" stroke="${accent}" stroke-width="3"/>
    <path d="M 90,0 A 90 90 0 0 0 0,-90" fill="none" stroke="${accent}" stroke-width="3"/>
    <path d="M 0,90 A 90 90 0 0 0 90,0" fill="none" stroke="${accent}" stroke-width="3"/>
    <path d="M -70,-60 Q -90,-80 -60,-90 Q -50,-60 -70,-60" fill="${accent}"/>
    <path d="M 70,-60 Q 90,-80 60,-90 Q 50,-60 70,-60" fill="${accent}"/>
    <path d="M -80,40 Q -110,30 -100,0 Q -70,10 -80,40" fill="${accent}"/>
    <path d="M 80,40 Q 110,30 100,0 Q 70,10 80,40" fill="${accent}"/>
    <path d="M -30,95 Q -40,120 0,110 Q -10,80 -30,95" fill="${accent}"/>
    <path d="M 30,95 Q 40,120 0,110 Q 10,80 30,95" fill="${accent}"/>
  </g>
  ${photoPlaceholder}

  <text x="250" y="440" font-family="${SCRIPT}" font-size="64" fill="${accent}" text-anchor="middle" font-style="italic">${name}</text>

  ${birthBlock}
  ${passingBlock}
  ${datesDivider}

  <text x="250" y="560" font-family="${SCRIPT}" font-size="32" fill="${accent}" text-anchor="middle" font-style="italic">${serviceDate}</text>
  <text x="250" y="600" font-family="${SCRIPT}" font-size="28" fill="${accent}" text-anchor="middle" font-style="italic">${venue}</text>
  <text x="250" y="625" font-family="${SANS}" font-size="13" fill="#DDDDDD" text-anchor="middle">${loc1}</text>
  ${loc2Block}

  <g transform="translate(80, 650)">${branch}</g>
  <g transform="translate(420, 650) scale(-1, 1)">${branch}</g>
${svgClose()}`;
}
