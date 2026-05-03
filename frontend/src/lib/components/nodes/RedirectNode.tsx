import type { NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import type { BaseNodeData } from "./BaseNode";

export default function RedirectNode({ data, selected }: NodeProps) {
  const { node } = data as unknown as BaseNodeData;
  const target = String(
    node.tweakValues["pagePath"] ?? node.tweakValues["url"] ?? "—"
  );
  return (
    <BaseNode kind={node.kind} selected={selected} label={`Redirect → ${target}`} />
  );
}
