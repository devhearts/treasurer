import { resolveInvitePhotoHref } from "../invite-photo";
import type { InviteTemplateId } from "../types";
import { INVITE_TEMPLATE_IDS, isInviteTemplateId } from "../types";
import { renderBotanical } from "./layouts/botanical";
import { renderCyber } from "./layouts/cyber";
import { renderMinimal } from "./layouts/minimal";
import { renderPastel } from "./layouts/pastel";
import { renderPop } from "./layouts/pop";
import { renderCelebrate } from "./layouts/celebrate";
import { renderGala } from "./layouts/gala";
import { renderSavedate } from "./layouts/savedate";
import { renderHeritage } from "./layouts/heritage";
import { renderMemorial } from "./layouts/memorial";
import { renderRoyal } from "./layouts/royal";
import {
  buildRenderContext,
  type RenderDims,
} from "./render-utils";
import type {
  InviteTemplateDefinition,
  InviteTemplateFieldConfig,
  InviteTemplateMeta,
} from "./types";
import { metaFromDefinition } from "./types";

const CORE: InviteTemplateFieldConfig[] = [
  { key: "name1" },
  { key: "name2", optional: true },
  { key: "headline" },
  { key: "date" },
  { key: "time", optional: true },
  { key: "venue" },
  { key: "location", optional: true },
  { key: "footer", multiline: true },
];

export const FALLBACK_TEMPLATE_ID: InviteTemplateId = "royal";

const DEFINITIONS: InviteTemplateDefinition[] = [
  {
    id: "royal",
    name: "Royal Luxury",
    tag: "Weddings · Galas",
    label: "ROYAL",
    format: { width: 400, height: 560, aspectClass: "5/7" },
    palette: {
      bg: "#0f172a",
      accent: "#F7E5A9",
      labelColor: "#F7E5A9",
    },
    fields: CORE,
    defaultHeader: "THE PLEASURE OF YOUR COMPANY IS REQUESTED",
    render: renderRoyal,
  },
  {
    id: "botanical",
    name: "Botanical Boho",
    tag: "Showers · Outdoors",
    label: "BOTANIC",
    format: { width: 400, height: 560, aspectClass: "5/7" },
    palette: {
      bg: "#F5EFE6",
      accent: "#6B7F4A",
      labelColor: "#4A5E2A",
    },
    fields: [
      { key: "name1" },
      { key: "name2", optional: true },
      { key: "headline" },
      { key: "subtitle", optional: true },
      { key: "date" },
      { key: "time", optional: true },
      { key: "venue" },
      { key: "location", optional: true },
      { key: "footer", multiline: true },
    ],
    defaultHeader: "please join us to celebrate",
    render: renderBotanical,
  },
  {
    id: "pop",
    name: "Vibrant Pop",
    tag: "Birthdays · Grad",
    label: "POP",
    format: { width: 400, height: 533, aspectClass: "3/4" },
    palette: {
      bg: "#0F0F0F",
      accent: "#FF3CAC",
      labelColor: "#FF3CAC",
    },
    fields: [
      { key: "name1" },
      { key: "name2", optional: true },
      { key: "headline" },
      { key: "tagline", optional: true },
      { key: "date" },
      { key: "time", optional: true },
      { key: "venue" },
      { key: "location", optional: true },
      { key: "footer", multiline: true },
    ],
    defaultHeader: "YOU ARE INVITED TO CELEBRATE!",
    labelOverrides: {
      wedding: { tagline: "Together with their families" },
    },
    render: renderPop,
  },
  {
    id: "minimal",
    name: "Ultra Minimal",
    tag: "Corporate · Gallery",
    label: "MINIMAL",
    format: { width: 400, height: 400, aspectClass: "1/1" },
    palette: {
      bg: "#FAFAFA",
      accent: "#1a1a1a",
      labelColor: "#1a1a1a",
    },
    fields: [
      { key: "name1" },
      { key: "name2", optional: true },
      { key: "headline" },
      { key: "hostLine", optional: true },
      { key: "date" },
      { key: "time", optional: true },
      { key: "venue" },
      { key: "location", optional: true },
      { key: "footer", multiline: true },
    ],
    defaultHeader: "you are invited",
    labelOverrides: {
      funeral: { name1: "Remembering" },
      introduction: { hostLine: "Hosted by" },
    },
    render: renderMinimal,
  },
  {
    id: "pastel",
    name: "Whimsical Pastel",
    tag: "Kids · Reveals",
    label: "PASTEL",
    format: { width: 400, height: 560, aspectClass: "5/7" },
    palette: {
      bg: "#FFF0F5",
      accent: "#D46B8A",
      labelColor: "#993556",
    },
    fields: [
      { key: "name1" },
      { key: "name2", optional: true },
      { key: "headline" },
      { key: "subtitle", optional: true },
      { key: "date" },
      { key: "time", optional: true },
      { key: "venue" },
      { key: "location", optional: true },
      { key: "footer", multiline: true },
    ],
    defaultHeader: "come celebrate with us",
    render: renderPastel,
  },
  {
    id: "cyber",
    name: "Cyberpunk Neon",
    tag: "Tech · Gaming",
    label: "CYBER",
    format: { width: 400, height: 225, aspectClass: "16/9" },
    palette: {
      bg: "#040810",
      accent: "#00F5FF",
      labelColor: "#00F5FF",
    },
    fields: [
      { key: "name1" },
      { key: "name2", optional: true },
      { key: "headline" },
      { key: "tagline", optional: true },
      { key: "hostLine", optional: true },
      { key: "date" },
      { key: "time", optional: true },
      { key: "venue" },
      { key: "location", optional: true },
      { key: "footer", multiline: true },
    ],
    defaultHeader: "YOU HAVE BEEN SELECTED TO ATTEND",
    render: renderCyber,
  },
  {
    id: "memorial",
    name: "Golden Memorial",
    tag: "Funerals · Memorials",
    label: "MEMORIAL",
    format: { width: 500, height: 700, aspectClass: "5/7" },
    palette: {
      bg: "#2A2A2A",
      accent: "#D4AF37",
      labelColor: "#FFFFFF",
    },
    fields: [
      { key: "headline", label: "Opening line" },
      { key: "name1", label: "Name" },
      { key: "subtitle", optional: true, label: "Date of birth" },
      { key: "tagline", optional: true, label: "Date of passing" },
      { key: "date", label: "Service date" },
      { key: "venue", label: "Service venue" },
      {
        key: "location",
        optional: true,
        label: "Address (new line for second line)",
      },
      { key: "footer", optional: true, multiline: true },
    ],
    defaultHeader: "In loving Memory of",
    supportsPhoto: true,
    labelOverrides: {
      funeral: {
        headline: "In loving Memory of",
        name1: "In memory of",
        subtitle: "Born",
        tagline: "Passed away",
      },
    },
    render: renderMemorial,
  },
  {
    id: "heritage",
    name: "Classic Heritage",
    tag: "Funerals · Memorials",
    label: "HERITAGE",
    format: { width: 500, height: 700, aspectClass: "5/7" },
    palette: {
      bg: "#F9F6EB",
      accent: "#B89966",
      labelColor: "#332211",
    },
    fields: [
      { key: "headline", label: "Header line" },
      { key: "name1", label: "Name" },
      {
        key: "subtitle",
        optional: true,
        label: "Life dates (banner)",
      },
      { key: "tagline", label: "Service title" },
      { key: "date", label: "Service date" },
      { key: "time", optional: true, label: "Service time" },
      { key: "location", label: "Address / location" },
      { key: "venue", optional: true, label: "Venue (optional)" },
      { key: "hostLine", optional: true, label: "RSVP contact name" },
      {
        key: "footer",
        optional: true,
        multiline: true,
        label: "RSVP phone & email (one per line)",
      },
    ],
    defaultHeader: "IN LOVING MEMORY",
    supportsPhoto: true,
    labelOverrides: {
      funeral: {
        headline: "IN LOVING MEMORY",
        subtitle: "Life dates",
        tagline: "Burial service",
        hostLine: "RSVP contact",
        footer: "Phone & email (one per line)",
      },
    },
    render: renderHeritage,
  },
  {
    id: "celebrate",
    name: "Confetti Celebrate",
    tag: "Birthdays · Parties",
    label: "CELEBRATE",
    format: { width: 500, height: 700, aspectClass: "5/7" },
    palette: {
      bg: "#FFFFFF",
      accent: "#48B5A3",
      labelColor: "#48B5A3",
    },
    fields: [
      { key: "headline", label: "Invitation line" },
      { key: "name1", label: "Name (script line)" },
      { key: "tagline", label: "Event title (e.g. 5TH BIRTHDAY)" },
      { key: "date", label: "Date" },
      { key: "time", optional: true, label: "Time" },
      { key: "venue", label: "Venue" },
      { key: "location", optional: true, label: "Location detail" },
      {
        key: "footer",
        optional: true,
        label: "RSVP line",
      },
      { key: "hostLine", optional: true, label: "RSVP contact (if not in footer)" },
    ],
    defaultHeader: "YOU ARE INVITED TO CELEBRATE",
    supportsPhoto: true,
    labelOverrides: {
      other: {
        headline: "You are invited to celebrate",
        name1: "Honoree name",
        tagline: "Birthday title",
        footer: "RSVP details",
      },
    },
    render: renderCelebrate,
  },
  {
    id: "savedate",
    name: "Save the Date",
    tag: "Weddings · Engagements",
    label: "SAVE DATE",
    format: { width: 500, height: 700, aspectClass: "5/7" },
    palette: {
      bg: "#A8B8D0",
      accent: "#D4AF37",
      labelColor: "#1A2B4C",
    },
    fields: [
      { key: "name1", label: "Groom / partner one" },
      { key: "name2", label: "Bride / partner two" },
      {
        key: "subtitle",
        label: "Invitation line 1",
      },
      {
        key: "tagline",
        label: "Invitation line 2",
      },
      {
        key: "date",
        label: "Date (YYYY-MM-DD or year month day)",
      },
      { key: "time", optional: true, label: "Time" },
      { key: "venue", label: "Venue name" },
      { key: "location", label: "Address" },
    ],
    defaultHeader: "Save the Date",
    labelOverrides: {
      wedding: {
        name1: "Groom's name",
        name2: "Bride's name",
        subtitle: "Invitation line 1",
        tagline: "Invitation line 2",
        date: "Wedding date",
      },
    },
    render: renderSavedate,
  },
  {
    id: "gala",
    name: "Gold Gala",
    tag: "Galas · Fundraisers",
    label: "GALA",
    format: { width: 500, height: 700, aspectClass: "5/7" },
    palette: {
      bg: "#663300",
      accent: "#D4AF37",
      labelColor: "#E8D0A5",
    },
    fields: [
      { key: "hostLine", label: "Organization / host" },
      {
        key: "subtitle",
        label: "Invitation line",
      },
      { key: "tagline", label: "Annual line (script)" },
      { key: "headline", label: "Event name" },
      { key: "date", label: "Date line 1" },
      { key: "time", label: "Date line 2 / time" },
      { key: "venue", label: "Venue" },
      { key: "location", label: "Address" },
      {
        key: "ceremonyNote",
        optional: true,
        label: "Join us line (script)",
      },
      {
        key: "footer",
        optional: true,
        multiline: true,
        label: "RSVP lines (one per line)",
      },
    ],
    defaultHeader: "FUNDRAISER",
    labelOverrides: {
      other: {
        hostLine: "Organization",
        tagline: "Annual edition",
        headline: "Event name",
        ceremonyNote: "Join us for",
        footer: "RSVP & deadline (one per line)",
      },
    },
    render: renderGala,
  },
];

const BY_ID = new Map(DEFINITIONS.map((d) => [d.id, d]));

let unknownTemplateLogged = false;

export function resolveTemplateId(id: string): InviteTemplateId {
  if (isInviteTemplateId(id)) return id;
  if (!unknownTemplateLogged && typeof console !== "undefined") {
    unknownTemplateLogged = true;
    console.warn(`[invites] Unknown templateId "${id}", using ${FALLBACK_TEMPLATE_ID}`);
  }
  return FALLBACK_TEMPLATE_ID;
}

export function getInviteTemplate(id: string): InviteTemplateDefinition {
  const resolved = resolveTemplateId(id);
  return BY_ID.get(resolved) ?? BY_ID.get(FALLBACK_TEMPLATE_ID)!;
}

export function getInviteTemplateMeta(id: string): InviteTemplateMeta {
  return metaFromDefinition(getInviteTemplate(id));
}

export const INVITE_TEMPLATE_LIST: InviteTemplateDefinition[] = DEFINITIONS;

export const INVITE_TEMPLATES: InviteTemplateMeta[] =
  DEFINITIONS.map(metaFromDefinition);

export function getTemplateFormat(id: string) {
  return getInviteTemplate(id).format;
}

export interface RenderTemplatePhotoOpts {
  eventSlug: string;
  invitationId?: string;
  /** Guest link token — resolves custom upload on public pages. */
  viewToken?: string;
  hasEventPhoto?: boolean;
  absolute?: boolean;
}

export function renderTemplateSvg(
  templateId: string,
  content: import("../types").InviteCardContent,
  opts?: {
    width?: number;
    height?: number;
    responsive?: boolean;
    photo?: RenderTemplatePhotoOpts;
  }
): string {
  const def = getInviteTemplate(templateId);
  const w = opts?.width ?? def.format.width;
  const h = opts?.height ?? def.format.height;
  const dims: RenderDims = { w, h, responsive: opts?.responsive ?? false };
  let photoHref: string | undefined;
  if (def.supportsPhoto && opts?.photo?.eventSlug) {
    photoHref = resolveInvitePhotoHref(templateId, content, {
      eventSlug: opts.photo.eventSlug,
      invitationId: opts.photo.invitationId,
      viewToken: opts.photo.viewToken,
      hasEventPhoto: opts.photo.hasEventPhoto,
      absolute: opts.photo.absolute,
    });
  }
  const ctx = buildRenderContext(
    content,
    def.palette,
    dims,
    def.defaultHeader,
    photoHref
  );
  return def.render(ctx);
}

export { INVITE_TEMPLATE_IDS, isInviteTemplateId };
export type {
  InviteTemplateDefinition,
  InviteTemplateFieldConfig,
  InviteTemplateFormat,
  InviteTemplateMeta,
  InviteAspectClass,
  LabelOverrides,
} from "./types";
