import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, useCurrentPage } from "../../store";
import { getSpec } from "../../registry";
import type { ComponentClass, ComponentNode } from "../../types";

export function DesignCanvas() {
  const page = useCurrentPage();
  const selectedId = useStore((s) => s.selectedComponentId);
  const setSelected = useStore((s) => s.setSelectedComponent);
  const addComponent = useStore((s) => s.addComponent);

  if (!page) {
    return (
      <div className="design-canvas" style={{ alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Select a page from the panel.</span>
      </div>
    );
  }

  const ctx = {
    isSelected: false,
    onSelect: setSelected,
    onDrop: (parentId: string, cls: ComponentClass, index: number) => {
      addComponent(parentId, cls, index);
    },
    selectedId,
  };

  return (
    <div className="design-canvas">
      <div className="design-root">
        <ComponentRenderer node={page.root} ctx={ctx} depth={0} />
      </div>
    </div>
  );
}

interface RendererProps {
  node: ComponentNode;
  ctx: ReturnType<typeof makeCtx>;
  depth: number;
}

function makeCtx(
  selectedId: string | null,
  onSelect: (id: string) => void,
  onDrop: (parentId: string, cls: ComponentClass, index: number) => void,
) {
  return { selectedId, onSelect, onDrop, isSelected: false };
}

function ComponentRenderer({ node, ctx, depth }: RendererProps) {
  const spec = getSpec(node.cls);
  const isSelected = ctx.selectedId === node.id;
  return (
    <AnimatePresence>
      <motion.div
        key={node.id}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.12 }}
        className={`design-component ${isSelected ? "selected" : ""}`}
        onClick={(e) => { e.stopPropagation(); ctx.onSelect(node.id); }}
      >
        {spec.render(node, { ...ctx, isSelected })}
        {node.cls === "container" && (
          <ContainerDropZones node={node} ctx={ctx} depth={depth} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function ContainerDropZones({ node, ctx, depth }: RendererProps) {
  const layout = node.layout;
  const direction = layout.kind === "flex" ? layout.direction : "column";

  return (
    <div
      style={{
        display: layout.kind === "flex" ? "flex" : "grid",
        flexDirection: direction === "row" ? "row" : "column",
        gap: layout.gap ?? 8,
        gridTemplateColumns:
          layout.kind === "grid" ? `repeat(${layout.columns}, 1fr)` : undefined,
        padding: 8,
        minHeight: 40,
      }}
    >
      {node.children.map((child, i) => (
        <span key={child.id}>
          <DropSlot parentId={node.id} index={i} ctx={ctx} />
          <ComponentRenderer node={child} ctx={ctx} depth={depth + 1} />
        </span>
      ))}
      <DropSlot parentId={node.id} index={node.children.length} ctx={ctx} />
    </div>
  );
}

interface DropSlotProps {
  parentId: string;
  index: number;
  ctx: ReturnType<typeof makeCtx>;
}

function DropSlot({ parentId, index, ctx }: DropSlotProps) {
  const [over, setOver] = useState(false);

  return (
    <div
      className={`design-drop-zone ${over ? "over" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const cls = e.dataTransfer.getData("visualis/component") as ComponentClass;
        if (cls) ctx.onDrop(parentId, cls, index);
      }}
    />
  );
}
