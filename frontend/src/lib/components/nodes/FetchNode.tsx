import type { NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import type { BaseNodeData } from "./BaseNode";

export default function FetchNode({ data, selected }: NodeProps) {
  const { node } = data as unknown as BaseNodeData;
  const method = String(node.tweakValues["method"] ?? "GET");
  return (
    <BaseNode kind={node.kind} selected={selected} label={`Fetch [${method}]`} />
  );
}
