import type { NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import type { BaseNodeData } from "./BaseNode";

export default function SetValueNode({ data, selected }: NodeProps) {
  const { node } = data as unknown as BaseNodeData;
  const id = String(node.tweakValues["componentId"] ?? "—");
  const field = String(node.tweakValues["field"] ?? "—");
  return (
    <BaseNode kind={node.kind} selected={selected} label={`SetValue: ${id}.${field}`} />
  );
}
