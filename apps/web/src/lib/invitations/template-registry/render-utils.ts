import type { InviteCardContent } from "../types";
import { getCardField } from "../types";

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fontFamily(font: InviteCardContent["font"]): string {
  switch (font) {
    case "monospace":
      return "Courier New, monospace";
    case "sans-serif":
      return "Helvetica, Arial, sans-serif";
    case "script":
      return "Georgia, cursive";
    default:
      return "Georgia, serif";
  }
}

export interface RenderDims {
  w: number;
  h: number;
  responsive: boolean;
}

export function svgOpen(dims: RenderDims): string {
  const { w, h, responsive } = dims;
  const sizeAttrs = responsive
    ? 'width="100%" height="100%" preserveAspectRatio="xMidYMid meet"'
    : `width="${w}" height="${h}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ${sizeAttrs}>`;
}

export function svgClose(): string {
  return "</svg>";
}

export interface Palette {
  bg: string;
  accent: string;
  labelColor: string;
}

export interface RenderContext {
  content: InviteCardContent;
  palette: Palette;
  dims: RenderDims;
  defaultHeader: string;
  field: typeof getCardField;
  esc: typeof esc;
  ff: string;
  accent: string;
  /** Resolved href for &lt;image&gt; (optional). */
  photoHref?: string;
}

export function buildRenderContext(
  content: InviteCardContent,
  palette: Palette,
  dims: RenderDims,
  defaultHeader: string,
  photoHref?: string
): RenderContext {
  const accent = content.accentColor?.trim() || palette.accent;
  return {
    content,
    palette,
    dims,
    defaultHeader,
    field: getCardField,
    esc,
    ff: fontFamily(content.font),
    accent,
    photoHref,
  };
}
