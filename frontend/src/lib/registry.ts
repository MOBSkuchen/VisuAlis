import type { ReactNode } from "react";
import type { ComponentClass, ComponentNode, JSONValue, Layout } from "./types";

// ─── Registry shape ──────────────────────────────────────────────────────────

export interface PropSpec {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "string[]";
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
  return { kind: "flex", direction: "column", gap: 8, align: "flex-start", justify: "flex-start" };
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
  "video",
  "table",
  "button",
];
