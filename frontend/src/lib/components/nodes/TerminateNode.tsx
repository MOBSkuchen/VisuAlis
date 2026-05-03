import type { NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import type { BaseNodeData } from "./BaseNode";

export default function TerminateNode({ data, selected }: NodeProps) {
  const { node } = data as unknown as BaseNodeData;
  return <BaseNode kind={node.kind} selected={selected} label="Terminate" />;
}
