import { Handle, Position } from "@xyflow/react";
import type { ReactNode } from "react";
import type { NodeKind } from "../../types";
import { typeColor } from "../../types";
import { NODE_REGISTRY, EXEC_OUT_LABEL } from "../../nodeRegistry";
import { EXEC_IN as EXEC_IN_PORT } from "../../types";

export interface BaseNodeData {
  node: import("../../types").ActionNode;
  action: import("../../types").Action | null;
}

const CATEGORY_CLASS: Record<string, string> = {
  trigger: "cat-trigger",
  return: "cat-return",
  logic: "cat-logic",
  pure: "cat-pure",
  action: "cat-action",
};

interface Props {
  kind: NodeKind;
  selected?: boolean;
  label: string;
  children?: ReactNode;
}

export function BaseNode({ kind, selected, label, children }: Props) {
  const spec = NODE_REGISTRY[kind];
  const catClass = CATEGORY_CLASS[spec.category] ?? "";

  return (
    <div className={`action-node ${catClass} ${selected ? "selected" : ""}`}>
      {spec.execIn && (
        <Handle
          type="target"
          position={Position.Top}
          id={EXEC_IN_PORT}
          className="exec-handle"
          style={{ top: -6 }}
        />
      )}

      <div className="action-node-header">{label}</div>

      <div className="action-node-body">
        {spec.dataInputs.map((port) => (
          <div key={port.id} className="node-port-row">
            <Handle
              type="target"
              position={Position.Left}
              id={port.id}
              className="data-handle"
              style={{ background: typeColor(port.type), borderColor: typeColor(port.type), left: -6 }}
            />
            <span style={{ marginLeft: 8 }}>{port.label}</span>
          </div>
        ))}

        {children}

        {spec.dataOutputs.map((port) => (
          <div key={port.id} className="node-port-row output">
            <span style={{ marginRight: 8 }}>{port.label}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={port.id}
              className="data-handle"
              style={{ background: typeColor(port.type), borderColor: typeColor(port.type), right: -6 }}
            />
          </div>
        ))}
      </div>

      {spec.execOuts.map((port, i) => (
        <Handle
          key={port}
          type="source"
          position={Position.Bottom}
          id={port}
          className="exec-handle"
          style={{
            bottom: -6,
            left: `${((i + 1) / (spec.execOuts.length + 1)) * 100}%`,
            transform: "translateX(-50%) rotate(180deg)",
          }}
          title={EXEC_OUT_LABEL[port] ?? port}
        />
      ))}
    </div>
  );
}
