import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { typeColor, typeLabel } from "../../types";
import type { BaseNodeData } from "./BaseNode";

export default function ConstantNode({ data, selected }: NodeProps) {
  const { node } = data as unknown as BaseNodeData;
  const t = node.constantType ?? { kind: "any" as const };
  const val = String(node.constantValue ?? "");

  return (
    <div className={`action-node cat-pure ${selected ? "selected" : ""}`}>
      <div className="action-node-header" style={{ color: typeColor(t) }}>
        {typeLabel(t)}
      </div>
      <div className="action-node-body">
        <div className="node-port-row output">
          <span style={{ marginRight: 8, fontFamily: "monospace", fontSize: 11 }}>{val || "—"}</span>
          <Handle
            type="source"
            position={Position.Right}
            id="value"
            className="data-handle"
            style={{ background: typeColor(t), borderColor: typeColor(t), right: -6 }}
          />
        </div>
      </div>
    </div>
  );
}
