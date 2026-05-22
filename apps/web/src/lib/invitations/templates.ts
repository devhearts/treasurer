import type { InviteTemplateId } from "./types";

export interface InviteTemplateMeta {
  id: InviteTemplateId;
  name: string;
  tag: string;
  bg: string;
  accent: string;
  labelColor: string;
  label: string;
}

export const INVITE_TEMPLATES: InviteTemplateMeta[] = [
  {
    id: "royal",
    name: "Royal Luxury",
    tag: "Weddings · Galas",
    bg: "#0f172a",
    accent: "#F7E5A9",
    labelColor: "#F7E5A9",
    label: "ROYAL",
  },
  {
    id: "botanical",
    name: "Botanical Boho",
    tag: "Showers · Outdoors",
    bg: "#F5EFE6",
    accent: "#6B7F4A",
    labelColor: "#4A5E2A",
    label: "BOTANIC",
  },
  {
    id: "pop",
    name: "Vibrant Pop",
    tag: "Birthdays · Grad",
    bg: "#0F0F0F",
    accent: "#FF3CAC",
    labelColor: "#FF3CAC",
    label: "POP",
  },
  {
    id: "minimal",
    name: "Ultra Minimal",
    tag: "Corporate · Gallery",
    bg: "#FAFAFA",
    accent: "#1a1a1a",
    labelColor: "#1a1a1a",
    label: "MINIMAL",
  },
  {
    id: "pastel",
    name: "Whimsical Pastel",
    tag: "Kids · Reveals",
    bg: "#FFF0F5",
    accent: "#D46B8A",
    labelColor: "#993556",
    label: "PASTEL",
  },
  {
    id: "cyber",
    name: "Cyberpunk Neon",
    tag: "Tech · Gaming",
    bg: "#040810",
    accent: "#00F5FF",
    labelColor: "#00F5FF",
    label: "CYBER",
  },
];

export function getTemplateMeta(id: InviteTemplateId): InviteTemplateMeta {
  return INVITE_TEMPLATES.find((t) => t.id === id) ?? INVITE_TEMPLATES[0]!;
}
