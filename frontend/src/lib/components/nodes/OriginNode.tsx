import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { typeColor, typeLabel } from "../../types";
import { NODE_REGISTRY } from "../../nodeRegistry";
import type { BaseNodeData } from "./BaseNode";

export default function OriginNode({ data, selected }: NodeProps) {
  const { node, action } = data as unknown as BaseNodeData;
  const spec = NODE_REGISTRY[node.kind];

  return (
    <div className={`action-node cat-trigger ${selected ? "selected" : ""}`}>
      <div className="action-node-header">Origin</div>
      <div className="action-node-body">
        {(action?.params ?? []).map((p) => (
          <div key={p.name} className="node-port-row output">
            <span style={{ marginRight: 8, fontSize: 10 }}>
              {p.name}: {typeLabel(p.type)}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={p.name}
              className="data-handle"
              style={{
                background: typeColor(p.type),
                borderColor: typeColor(p.type),
                right: -6,
              }}
            />
          </div>
        ))}
        {(action?.params ?? []).length === 0 && (
          <span className="muted" style={{ fontSize: 10 }}>No params</span>
        )}
      </div>
      {spec.execOuts.map((port) => (
        <Handle
          key={port}
          type="source"
          position={Position.Bottom}
          id={port}
          className="exec-handle"
          style={{ bottom: -6, transform: "rotate(180deg)" }}
        />
      ))}
    </div>
  );
}
