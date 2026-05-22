import type { EventType } from "@/lib/types";
import type {
  InviteCardContent,
  InviteCardFieldKey,
  InviteTemplateId,
} from "../types";
import type { RenderContext } from "./render-utils";

export type InviteAspectClass = "5/7" | "1/1" | "3/4" | "16/9";

export interface InviteTemplateFormat {
  width: number;
  height: number;
  aspectClass: InviteAspectClass;
}

export interface InviteTemplateFieldConfig {
  key: InviteCardFieldKey;
  optional?: boolean;
  multiline?: boolean;
  /** Static label override (else resolved via event type + template). */
  label?: string;
}

export type LabelOverrides = Partial<
  Record<EventType, Partial<Record<InviteCardFieldKey, string>>>
>;

export interface InviteTemplateDefinition {
  id: InviteTemplateId;
  name: string;
  tag: string;
  label: string;
  format: InviteTemplateFormat;
  palette: { bg: string; accent: string; labelColor: string };
  fields: InviteTemplateFieldConfig[];
  defaultHeader: string;
  /** Card includes a photo area (upload or event gallery default). */
  supportsPhoto?: boolean;
  labelOverrides?: LabelOverrides;
  render: (ctx: RenderContext) => string;
}

export interface InviteTemplateMeta {
  id: InviteTemplateId;
  name: string;
  tag: string;
  bg: string;
  accent: string;
  labelColor: string;
  label: string;
}

export function metaFromDefinition(
  def: InviteTemplateDefinition
): InviteTemplateMeta {
  return {
    id: def.id,
    name: def.name,
    tag: def.tag,
    bg: def.palette.bg,
    accent: def.palette.accent,
    labelColor: def.palette.labelColor,
    label: def.label,
  };
}

export type { InviteCardContent };
