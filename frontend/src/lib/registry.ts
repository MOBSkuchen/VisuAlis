import type { ReactNode } from "react";
import type { ComponentClass, ComponentNode, JSONValue, Layout } from "./types";

// ─── Registry shape ──────────────────────────────────────────────────────────

export interface PropSpec {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "string[]" | "options";
  default: JSONValue;
}

export interface TriggerSpec {
  event: string;
  label: string;
}

export interface RenderCtx {
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDrop: (parentId: string, cls: ComponentClass, index: number) => void;
  selectedId: string | null;
}

export interface ComponentSpec {
  cls: ComponentClass;
  tag: string;
  label: string;
  staticProps: PropSpec[];
  variableProps: PropSpec[];
  triggers: TriggerSpec[];
  render: (node: ComponentNode, ctx: RenderCtx) => ReactNode;
}

// ─── Default layout ──────────────────────────────────────────────────────────

export function defaultLayout(): Layout {
  return { kind: "flex", direction: "column", gap: 8, align: "stretch", justify: "flex-start" };
}

// Sensible starting size/sizing per component class so newly-dropped components
// are immediately visible and usable. Returns staticProps that get merged with
// the per-class defaults from the spec.
export function defaultStaticProps(cls: ComponentClass): Record<string, JSONValue> {
  switch (cls) {
    case "container":
      return { __width: "fill", __height: 200, padding: 12 };
    case "button":
    case "text_input":
    case "dropdown":
    case "file_upload":
      return { __width: 200 };
    case "table":
    case "video":
      return { __width: "fill", __height: 240 };
    case "label":
    case "static_text":
    case "checkbox":
      return {}; // hug content
    case "buffer":
      return {}; // buffer's own grow/size handle this
    default:
      return {};
  }
}

// ─── Registry ────────────────────────────────────────────────────────────────

// Populated lazily by individual component files to avoid circular imports.
const _registry: Partial<Record<ComponentClass, ComponentSpec>> = {};

export function registerComponent(spec: ComponentSpec): void {
  _registry[spec.cls] = spec;
}

export function getSpec(cls: ComponentClass): ComponentSpec {
  const spec = _registry[cls];
  if (!spec) throw new Error(`No spec registered for component class '${cls}'`);
  return spec;
}

export function allSpecs(): ComponentSpec[] {
  return Object.values(_registry) as ComponentSpec[];
}

export const COMPONENT_CLASSES: ComponentClass[] = [
  "container",
  "text_input",
  "file_upload",
  "dropdown",
  "checkbox",
  "static_text",
  "label",
  "buffer",
  "video",
  "table",
  "button",
];
