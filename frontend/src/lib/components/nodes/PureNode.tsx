import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import type { BaseNodeData } from "./BaseNode";

export default function PureNode({ data, selected }: NodeProps) {
  const { node } = data as unknown as BaseNodeData;
  const op = node.pureOp ?? "—";

  return (
    <div className={`action-node cat-pure ${selected ? "selected" : ""}`}>
      <div className="action-node-header">Expression</div>
      <div className="action-node-body">
        <div className="node-port-row">
          <Handle type="target" position={Position.Left} id="a" className="data-handle"
            style={{ background: "var(--fg-2)", borderColor: "var(--fg-2)", left: -6 }} />
          <span style={{ marginLeft: 8 }}>a</span>
        </div>
        <div className="node-port-row">
          <Handle type="target" position={Position.Left} id="b" className="data-handle"
            style={{ background: "var(--fg-2)", borderColor: "var(--fg-2)", left: -6 }} />
          <span style={{ marginLeft: 8 }}>b</span>
        </div>
        <div style={{ textAlign: "center", padding: "2px 0", fontSize: 11, fontFamily: "monospace", color: "var(--t-int)" }}>
          {op}
        </div>
        <div className="node-port-row output">
          <span style={{ marginRight: 8 }}>result</span>
          <Handle type="source" position={Position.Right} id="result" className="data-handle"
            style={{ background: "var(--fg-2)", borderColor: "var(--fg-2)", right: -6 }} />
        </div>
      </div>
    </div>
  );
}
