import type { RenderContext } from "../render-utils";
import { svgClose } from "../render-utils";

const BG = "#A8B8D0";
const NAVY = "#1A2B4C";
const MUTED = "#3A4B6C";
const GOLD = "#D4AF37";
const SCRIPT = "Georgia, cursive";
const SERIF = "Georgia, 'Playfair Display', 'Times New Roman', serif";
const SANS = "Montserrat, Helvetica, Arial, sans-serif";

function splitDateParts(dateStr: string): {
  year: string;
  month: string;
  day: string;
} {
  const s = dateStr.trim();
  if (!s) return { year: "", month: "", day: "" };
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (iso) {
    return {
      year: iso[1],
      month: iso[2].padStart(2, "0"),
      day: iso[3].padStart(2, "0"),
    };
  }
  const ymd = /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(s);
  if (ymd) {
    return {
      year: ymd[1],
      month: ymd[2].padStart(2, "0"),
      day: ymd[3].padStart(2, "0"),
    };
  }
  const dmy = /(\d{1,2})\D+(\d{1,2})\D+(\d{4})/.exec(s);
  if (dmy) {
    return {
      year: dmy[3],
      month: dmy[2].padStart(2, "0"),
      day: dmy[1].padStart(2, "0"),
    };
  }
  return { year: s, month: "", day: "" };
}

function formatTimeLine(time: string): string {
  const t = time.trim();
  if (!t) return "";
  if (/^at\s/i.test(t)) return t.toUpperCase();
  return `AT ${t.toUpperCase()}`;
}

const DECOR_CLUSTER = `<g transform="translate(60, 350)">
    <circle cx="0" cy="-220" r="60" fill="#F8F9FA" opacity="0.9"/>
    <circle cx="0" cy="-220" r="40" fill="#FFFFFF"/>
    <circle cx="0" cy="-220" r="10" fill="#F4D03F"/>
    <circle cx="20" cy="-90" r="75" fill="#C5D3E8" opacity="0.95"/>
    <path d="M 20,-90 L 80,-120 A 50 50 0 0 1 60,-40 Z" fill="#B0C4DE"/>
    <circle cx="20" cy="-90" r="15" fill="#F8F9FA"/>
    <circle cx="70" cy="-10" r="30" fill="#FCFDFD"/>
    <circle cx="70" cy="-10" r="8" fill="#F4D03F"/>
    <circle cx="-10" cy="70" r="80" fill="#3B597C" opacity="0.95"/>
    <path d="M -10,70 L 60,30 A 60 60 0 0 1 50,120 Z" fill="#2C4463"/>
    <circle cx="-10" cy="70" r="20" fill="#1A2B4C"/>
    <circle cx="20" cy="220" r="70" fill="#FFFFFF" opacity="0.95"/>
    <path d="M 20,220 L 70,170 A 50 50 0 0 1 80,260 Z" fill="#F0F4F8"/>
    <circle cx="20" cy="220" r="15" fill="#F4D03F"/>
    <circle cx="100" cy="300" r="60" fill="#1A2B4C"/>
  </g>`;

/** Save the Date — gold frame, bubble art, split date (500×700). */
export function renderSavedate(ctx: RenderContext): string {
  const { esc, field, accent: accentIn } = ctx;
  const vbW = 500;
  const vbH = 700;
  const accent = accentIn || GOLD;
  const sizeAttrs = ctx.dims.responsive
    ? `width="100%" height="100%" viewBox="0 0 ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet"`
    : `width="${ctx.dims.w}" height="${ctx.dims.h}" viewBox="0 0 ${vbW} ${vbH}"`;

  const groom = esc(field(ctx.content, "name1") || "Groom's Name");
  const brideRaw = field(ctx.content, "name2")?.trim();
  const bride = esc(brideRaw || "Bride's Name");
  const namesBlock = brideRaw
    ? `<text y="300" font-family="${SERIF}" font-size="20" fill="${NAVY}" text-anchor="middle" font-weight="bold">${groom}</text>
    <text y="340" font-family="${SCRIPT}" font-size="20" fill="${NAVY}" text-anchor="middle">&amp;</text>
    <text y="380" font-family="${SERIF}" font-size="20" fill="${NAVY}" text-anchor="middle" font-weight="bold">${bride}</text>`
    : `<text y="340" font-family="${SERIF}" font-size="20" fill="${NAVY}" text-anchor="middle" font-weight="bold">${groom}</text>`;
  const invite1 = esc(
    field(ctx.content, "subtitle") || "JOYFULLY INVITES YOU TO JOIN"
  );
  const invite2 = esc(
    field(ctx.content, "tagline") || "THEIR WEDDING CELEBRATION"
  );
  const { year, month, day } = splitDateParts(field(ctx.content, "date"));
  const yearT = esc(year);
  const monthT = esc(month);
  const dayT = esc(day);
  const timeLine = esc(formatTimeLine(field(ctx.content, "time")));
  const venue = esc(field(ctx.content, "venue") || "Venue");
  const location = esc(field(ctx.content, "location") || "Address");

  const dateBlock =
    year || month || day
      ? `<g transform="translate(0, 490)">
      <text x="-60" y="0" font-family="${SCRIPT}" font-size="38" fill="${NAVY}" text-anchor="middle">${yearT}</text>
      <line x1="-15" y1="-30" x2="-15" y2="10" stroke="${NAVY}" stroke-width="1.5"/>
      <text x="15" y="0" font-family="${SCRIPT}" font-size="38" fill="${NAVY}" text-anchor="middle">${monthT}</text>
      <line x1="45" y1="-30" x2="45" y2="10" stroke="${NAVY}" stroke-width="1.5"/>
      <text x="80" y="0" font-family="${SCRIPT}" font-size="38" fill="${NAVY}" text-anchor="middle">${dayT}</text>
    </g>`
      : "";

  const timeBlock = timeLine
    ? `<text y="525" font-family="${SANS}" font-size="10" fill="${MUTED}" text-anchor="middle" letter-spacing="1">${timeLine}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" ${sizeAttrs}>
  <rect width="${vbW}" height="${vbH}" fill="${BG}"/>
  <polyline points="130,650 390,650 390,50 130,50" fill="none" stroke="${accent}" stroke-width="3"/>
  ${DECOR_CLUSTER}
  <g transform="translate(270, 0)">
    <text y="140" font-family="${SCRIPT}" font-size="56" fill="${NAVY}" text-anchor="middle">Save</text>
    <text y="180" font-family="${SCRIPT}" font-size="28" fill="${NAVY}" text-anchor="middle">the</text>
    <text y="240" font-family="${SCRIPT}" font-size="56" fill="${NAVY}" text-anchor="middle">Date</text>
    ${namesBlock}
    <text y="420" font-family="${SANS}" font-size="11" fill="${MUTED}" text-anchor="middle" letter-spacing="1">${invite1}</text>
    <text y="440" font-family="${SANS}" font-size="11" fill="${MUTED}" text-anchor="middle" letter-spacing="1">${invite2}</text>
    ${dateBlock}
    ${timeBlock}
    <text y="580" font-family="${SCRIPT}" font-size="32" fill="${NAVY}" text-anchor="middle">${venue}</text>
    <text y="615" font-family="${SCRIPT}" font-size="32" fill="${NAVY}" text-anchor="middle">${location}</text>
  </g>
${svgClose()}`;
}
