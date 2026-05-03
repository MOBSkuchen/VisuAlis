import type { NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import type { BaseNodeData } from "./BaseNode";
import { typeColor } from "../../types";

export default function LoopNode({ data, selected }: NodeProps) {
  const { node } = data as unknown as BaseNodeData;
  const itemType = node.loopItemType ?? { kind: "any" as const };

  return (
    <BaseNode kind={node.kind} selected={selected} label="Loop">
      <span style={{ fontSize: 10, color: typeColor(itemType) }}>
        item: {itemType.kind}
      </span>
    </BaseNode>
  );
}
