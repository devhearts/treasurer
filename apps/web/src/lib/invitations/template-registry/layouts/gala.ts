import type { RenderContext } from "../render-utils";
import { svgClose } from "../render-utils";

const BG = "#663300";
const CREAM = "#E8D0A5";
const GOLD = "#D4AF37";
const SCRIPT = "Georgia, cursive";
const SANS = "Montserrat, Helvetica, Arial, sans-serif";

const GOLD_ORNAMENT = `<g transform="translate(250, 480) scale(1.5)">
    <path d="M 0,-15 C 10,-30 20,-10 0,15 C -20,-10 -10,-30 0,-15 Z" fill="url(#galaGoldFoil)"/>
    <path d="M -5,5 C -30,-20 -60,-10 -80,-30 C -60,0 -40,30 -10,15 C -30,25 -50,15 -70,25 C -40,40 -20,30 0,15 Z" fill="url(#galaGoldFoil)"/>
    <path d="M 5,5 C 30,-20 60,-10 80,-30 C 60,0 40,30 10,15 C 30,25 50,15 70,25 C 40,40 20,30 0,15 Z" fill="url(#galaGoldFoil)"/>
    <path d="M -15,10 C -40,40 -20,60 -10,40 C -20,50 -25,35 -15,10 Z" fill="url(#galaGoldFoil)"/>
    <path d="M 15,10 C 40,40 20,60 10,40 C 20,50 25,35 15,10 Z" fill="url(#galaGoldFoil)"/>
  </g>`;

/** Corporate gala / fundraiser — gold foil ornament (500×700). */
export function renderGala(ctx: RenderContext): string {
  const { esc, field, defaultHeader, accent: accentIn } = ctx;
  const vbW = 500;
  const vbH = 700;
  const accent = accentIn || GOLD;
  const sizeAttrs = ctx.dims.responsive
    ? `width="100%" height="100%" viewBox="0 0 ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet"`
    : `width="${ctx.dims.w}" height="${ctx.dims.h}" viewBox="0 0 ${vbW} ${vbH}"`;

  const org = esc(
    (field(ctx.content, "hostLine") || field(ctx.content, "name1") || "Organization")
      .toUpperCase()
  );
  const inviteLine = esc(
    (field(ctx.content, "subtitle") || "CORDIALLY INVITES YOU TO A").toUpperCase()
  );
  const annual = esc(field(ctx.content, "tagline") || "Annual Event");
  const eventName = esc(
    (field(ctx.content, "headline")?.trim() || defaultHeader).toUpperCase()
  );
  const dateLine = esc((field(ctx.content, "date") || "").toUpperCase());
  const timeLine = esc((field(ctx.content, "time") || "").toUpperCase());
  const venue = esc((field(ctx.content, "venue") || "").toUpperCase());
  const location = esc((field(ctx.content, "location") || "").toUpperCase());
  const joinLine = esc(
    field(ctx.content, "ceremonyNote") ||
      field(ctx.content, "receptionNote") ||
      "Join us for Dinner & Dancing"
  );

  const footerRaw = field(ctx.content, "footer");
  const footerLines = footerRaw
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const rsvp1 = esc((footerLines[0] || "").toUpperCase());
  const rsvp2 = esc((footerLines[1] || "").toUpperCase());

  const dateBlock = dateLine
    ? `<text x="250" y="300" font-family="${SANS}" font-size="12" fill="${CREAM}" text-anchor="middle" letter-spacing="1">${dateLine}</text>`
    : "";
  const timeBlock = timeLine
    ? `<text x="250" y="325" font-family="${SANS}" font-size="12" fill="${CREAM}" text-anchor="middle" letter-spacing="1">${timeLine}</text>`
    : "";
  const venueBlock = venue
    ? `<text x="250" y="355" font-family="${SANS}" font-size="12" fill="${CREAM}" text-anchor="middle" letter-spacing="1">${venue}</text>`
    : "";
  const locBlock = location
    ? `<text x="250" y="380" font-family="${SANS}" font-size="12" fill="${CREAM}" text-anchor="middle" letter-spacing="1">${location}</text>`
    : "";
  const rsvpBlock = [rsvp1, rsvp2]
    .filter(Boolean)
    .map((line, i) => {
      const y = 630 + i * 25;
      return `<text x="250" y="${y}" font-family="${SANS}" font-size="12" fill="${CREAM}" text-anchor="middle" letter-spacing="1">${line}</text>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" ${sizeAttrs}>
  <defs>
    <linearGradient id="galaGoldFoil" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFDF73"/>
      <stop offset="50%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#997A00"/>
    </linearGradient>
  </defs>
  <rect width="${vbW}" height="${vbH}" fill="${BG}"/>
  <rect x="25" y="25" width="450" height="650" fill="none" stroke="${accent}" stroke-width="1" opacity="0.6"/>

  <text x="250" y="80" font-family="${SANS}" font-size="14" fill="${CREAM}" text-anchor="middle" letter-spacing="1">${org}</text>
  <text x="250" y="110" font-family="${SANS}" font-size="14" fill="${CREAM}" text-anchor="middle" letter-spacing="1">${inviteLine}</text>

  <text x="250" y="190" font-family="${SCRIPT}" font-size="64" fill="#FFFFFF" text-anchor="middle">${annual}</text>
  <text x="250" y="240" font-family="${SANS}" font-size="24" fill="#FFFFFF" text-anchor="middle" font-weight="bold" letter-spacing="6">${eventName}</text>

  ${dateBlock}
  ${timeBlock}
  ${venueBlock}
  ${locBlock}

  ${GOLD_ORNAMENT}

  <text x="250" y="580" font-family="${SCRIPT}" font-size="42" fill="#FFFFFF" text-anchor="middle">${joinLine}</text>
  ${rsvpBlock}
${svgClose()}`;
}
