import type { ActionNode, NodeKind, WorkflowType } from "./types";
import { EXEC_OUT, EXEC_ERR, EXEC_TRUE, EXEC_FALSE, EXEC_BODY, EXEC_DONE } from "./types";

export type NodeCategory = "trigger" | "return" | "logic" | "pure" | "action";

export interface PortSpec {
  id: string;
  label: string;
  type: WorkflowType;
}

export interface NodeSpec {
  kind: NodeKind;
  label: string;
  category: NodeCategory;
  execIn: boolean;
  execOuts: string[];
  dataInputs: PortSpec[];
  dataOutputs: PortSpec[];
  resolvePortType: (node: ActionNode, port: string, side: "source" | "target") => WorkflowType | undefined;
}

const ANY: WorkflowType = { kind: "any" };
const BOOL: WorkflowType = { kind: "bool" };
const STR: WorkflowType = { kind: "string" };
const INT: WorkflowType = { kind: "int" };
const ARR_ANY: WorkflowType = { kind: "array", of: ANY };
const DICT_STR: WorkflowType = { kind: "dict", value: STR };

export const NODE_REGISTRY: Record<NodeKind, NodeSpec> = {
  origin: {
    kind: "origin",
    label: "Origin",
    category: "trigger",
    execIn: false,
    execOuts: [EXEC_OUT],
    dataInputs: [],
    dataOutputs: [],
    resolvePortType(_node, _port, side) {
      if (side !== "source") return undefined;
      // Origin outputs are action params, resolved dynamically in FlowCanvas
      return ANY;
    },
  },

  terminate: {
    kind: "terminate",
    label: "Terminate",
    category: "return",
    execIn: true,
    execOuts: [],
    dataInputs: [],
    dataOutputs: [],
    resolvePortType: () => undefined,
  },

  branch: {
    kind: "branch",
    label: "Branch",
    category: "logic",
    execIn: true,
    execOuts: [EXEC_TRUE, EXEC_FALSE],
    dataInputs: [{ id: "condition", label: "condition", type: BOOL }],
    dataOutputs: [],
    resolvePortType(_node, port, side) {
      if (side === "target" && port === "condition") return BOOL;
      return undefined;
    },
  },

  loop: {
    kind: "loop",
    label: "Loop",
    category: "logic",
    execIn: true,
    execOuts: [EXEC_BODY, EXEC_DONE],
    dataInputs: [{ id: "iter", label: "iter", type: ARR_ANY }],
    dataOutputs: [{ id: "item", label: "item", type: ANY }],
    resolvePortType(node, port, side) {
      if (side === "target" && port === "iter") return ARR_ANY;
      if (side === "source" && port === "item") return node.loopItemType ?? ANY;
      return undefined;
    },
  },

  constant: {
    kind: "constant",
    label: "Constant",
    category: "pure",
    execIn: false,
    execOuts: [],
    dataInputs: [],
    dataOutputs: [{ id: "value", label: "value", type: ANY }],
    resolvePortType(node, port, side) {
      if (side === "source" && port === "value") return node.constantType ?? ANY;
      return undefined;
    },
  },

  pure: {
    kind: "pure",
    label: "Expression",
    category: "pure",
    execIn: false,
    execOuts: [],
    dataInputs: [
      { id: "a", label: "a", type: ANY },
      { id: "b", label: "b", type: ANY },
    ],
    dataOutputs: [{ id: "result", label: "result", type: ANY }],
    resolvePortType: () => ANY,
  },

  fetch: {
    kind: "fetch",
    label: "Fetch",
    category: "action",
    execIn: true,
    execOuts: [EXEC_OUT, EXEC_ERR],
    dataInputs: [
      { id: "url", label: "url", type: STR },
      { id: "headers", label: "headers", type: DICT_STR },
      { id: "body", label: "body", type: STR },
    ],
    dataOutputs: [
      { id: "status", label: "status", type: INT },
      { id: "body", label: "body", type: STR },
      { id: "json", label: "json", type: ANY },
    ],
    resolvePortType(_node, port, side) {
      const inputs: Record<string, WorkflowType> = { url: STR, headers: DICT_STR, body: STR };
      const outputs: Record<string, WorkflowType> = { status: INT, body: STR, json: ANY };
      if (side === "target") return inputs[port];
      if (side === "source") return outputs[port];
      return undefined;
    },
  },

  get_value: {
    kind: "get_value",
    label: "GetValue",
    category: "action",
    execIn: true,
    execOuts: [EXEC_OUT, EXEC_ERR],
    dataInputs: [],
    dataOutputs: [{ id: "value", label: "value", type: ANY }],
    resolvePortType(_node, port, side) {
      if (side === "source" && port === "value") return ANY;
      return undefined;
    },
  },

  set_value: {
    kind: "set_value",
    label: "SetValue",
    category: "action",
    execIn: true,
    execOuts: [EXEC_OUT, EXEC_ERR],
    dataInputs: [{ id: "value", label: "value", type: ANY }],
    dataOutputs: [],
    resolvePortType(_node, port, side) {
      if (side === "target" && port === "value") return ANY;
      return undefined;
    },
  },

  redirect: {
    kind: "redirect",
    label: "Redirect",
    category: "action",
    execIn: true,
    execOuts: [],
    dataInputs: [{ id: "url", label: "url", type: STR }],
    dataOutputs: [],
    resolvePortType(_node, port, side) {
      if (side === "target" && port === "url") return STR;
      return undefined;
    },
  },
};

export function resolvePortType(
  node: ActionNode,
  port: string,
  side: "source" | "target",
): WorkflowType | undefined {
  return NODE_REGISTRY[node.kind]?.resolvePortType(node, port, side);
}

export const EXEC_OUT_LABEL: Record<string, string> = {
  [EXEC_OUT]: "▸",
  [EXEC_ERR]: "✕",
  [EXEC_TRUE]: "T",
  [EXEC_FALSE]: "F",
  [EXEC_BODY]: "body",
  [EXEC_DONE]: "done",
};
