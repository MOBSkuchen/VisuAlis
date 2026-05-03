import type { NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import type { BaseNodeData } from "./BaseNode";

export default function GetValueNode({ data, selected }: NodeProps) {
  const { node } = data as unknown as BaseNodeData;
  const id = String(node.tweakValues["componentId"] ?? "—");
  return (
    <BaseNode kind={node.kind} selected={selected} label={`GetValue: ${id}`} />
  );
}
