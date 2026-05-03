// ─── Shared workflow types (same lattice as AuTomato) ───────────────────────

export type WorkflowType =
  | { kind: "int" }
  | { kind: "float" }
  | { kind: "string" }
  | { kind: "bool" }
  | { kind: "array"; of: WorkflowType }
  | { kind: "dict"; value: WorkflowType }
  | { kind: "custom"; name: string }
  | { kind: "any" };

export type EdgeKind = "data" | "exec";

// ─── Exec port constants ────────────────────────────────────────────────────

export const EXEC_IN = "__in__";
export const EXEC_OUT = "__out__";
export const EXEC_ERR = "__err__";
export const EXEC_TRUE = "__true__";
export const EXEC_FALSE = "__false__";
export const EXEC_BODY = "__body__";
export const EXEC_DONE = "__done__";

const EXEC_PORT_SET = new Set<string>([
  EXEC_IN, EXEC_OUT, EXEC_ERR, EXEC_TRUE, EXEC_FALSE, EXEC_BODY, EXEC_DONE,
]);

export function isExecPort(id: string): boolean {
  return EXEC_PORT_SET.has(id);
}

// ─── Action graph types ─────────────────────────────────────────────────────

export type NodeKind =
  | "origin"
  | "terminate"
  | "branch"
  | "loop"
  | "constant"
  | "fetch"
  | "get_value"
  | "set_value"
  | "redirect"
  | "pure";

export type PureOp =
  | "concat" | "add" | "sub" | "mul" | "div"
  | "eq" | "neq" | "lt" | "gt"
  | "and" | "or" | "not"
  | "to_string" | "json_parse" | "json_stringify" | "len";

export interface ActionNode {
  id: string;
  kind: NodeKind;
  position: { x: number; y: number };
  tweakValues: Record<string, unknown>;
  literalInputs: Record<string, unknown>;
  constantType?: WorkflowType;
  constantValue?: unknown;
  loopItemType?: WorkflowType;
  pureOp?: PureOp;
}

export interface ActionEdge {
  id: string;
  from: { nodeId: string; port: string };
  to: { nodeId: string; port: string };
  kind: EdgeKind;
}

export interface ActionGraph {
  nodes: ActionNode[];
  edges: ActionEdge[];
}

export interface Param {
  name: string;
  type: WorkflowType;
}

export interface Action {
  id: string;
  name: string;
  params: Param[];
  graph: ActionGraph;
}

// ─── Design canvas types ────────────────────────────────────────────────────

export type ComponentClass =
  | "container"
  | "text_input"
  | "file_upload"
  | "dropdown"
  | "checkbox"
  | "static_text"
  | "video"
  | "table"
  | "button";

export type Layout =
  | { kind: "flex"; direction: "row" | "column"; gap: number; align: string; justify: string }
  | { kind: "grid"; columns: number; gap: number };

export type JSONValue =
  | null
  | boolean
  | number
  | string
  | JSONValue[]
  | { [key: string]: JSONValue };

export interface ComponentNode {
  id: string;
  cls: ComponentClass;
  staticProps: Record<string, JSONValue>;
  variableProps: Record<string, JSONValue>;
  triggers: Record<string, string | null>;
  children: ComponentNode[];
  layout: Layout;
}

export interface Page {
  id: string;
  path: string;
  title: string;
  root: ComponentNode;
}

export interface Project {
  id: string;
  name: string;
  version: string;
  pages: Page[];
  actions: Action[];
  customTypes: [];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function typeLabel(t: WorkflowType): string {
  switch (t.kind) {
    case "array": return `array<${typeLabel(t.of)}>`;
    case "dict": return `dict<${typeLabel(t.value)}>`;
    case "custom": return t.name;
    default: return t.kind;
  }
}

export function typeColor(t: WorkflowType): string {
  const colors: Record<string, string> = {
    int: "var(--t-int)",
    float: "var(--t-float)",
    string: "var(--t-string)",
    bool: "var(--t-bool)",
    array: "var(--t-array)",
    dict: "var(--t-dict)",
    custom: "var(--t-custom)",
    any: "var(--fg-2)",
  };
  return colors[t.kind] ?? "var(--fg-2)";
}

export function defaultValue(t: WorkflowType): unknown {
  switch (t.kind) {
    case "int":
    case "float": return 0;
    case "bool": return false;
    default: return "";
  }
}
