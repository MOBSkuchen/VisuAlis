import { Fragment, useState, type CSSProperties } from "react";
import { useStore } from "../../store";
import { getSpec } from "../../registry";
import type { ComponentNode, JSONValue } from "../../types";
import { layoutToCSS, sizingToCSS } from "./layout";
import { parseDrag, setDragMove, dragHasPayload, DRAG_NEW } from "./dnd";
import { SelectionFrame } from "./SelectionFrame";

// Recursive renderer for the page tree. Owns:
//  - selection click
//  - drag-to-move on every existing node
//  - drop slots between siblings + into empty containers
//  - mounts SelectionFrame (resize handles + size badge) on the selected node

export function ComponentTree({ root }: { root: ComponentNode }) {
  return <Node node={root} depth={0} />;
}

function Node({ node, depth }: { node: ComponentNode; depth: number }) {
  const spec = getSpec(node.cls);
  const selected = useStore((s) => s.selectedComponentId === node.id);
  const setSelected = useStore((s) => s.setSelectedComponent);

  const isContainer = node.cls === "container";
  const isBuffer = node.cls === "buffer";
  const isRoot = depth === 0;
  const isDisabled = node.staticProps["disabled"] === true;

  // Compose wrapper style. Order matters: defaults < user sizing < buffer-specific.
  const wrapperStyle: CSSProperties = {
    ...(isRoot ? rootStyle() : {}),
    ...sizingToCSS(node),
    ...(isBuffer ? bufferStyle(node) : {}),
  };

  const cls = [
    "design-component",
    `dc-${node.cls}`,
    `depth-${Math.min(depth, 4)}`,
    isRoot && "is-root",
    selected && "selected",
    isBuffer && "is-buffer",
    isContainer && "is-container",
    isDisabled && "is-disabled",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={cls}
      style={wrapperStyle}
      draggable={!isRoot}
      onDragStart={(e) => {
        if (isRoot) return;
        e.stopPropagation();
        setDragMove(e, node.id);
        document.body.classList.add("is-dragging-component");
      }}
      onDragEnd={() => document.body.classList.remove("is-dragging-component")}
      onClick={(e) => { e.stopPropagation(); setSelected(node.id); }}
      data-node-id={node.id}
      data-node-cls={node.cls}
    >
      <span className="design-tag">{spec.label} · <code>{shortId(node.id)}</code></span>

      {isContainer ? (
        <ContainerInner node={node} depth={depth} />
      ) : (
        <div className="dc-render">{spec.render(node, makeRenderCtx(node.id, selected))}</div>
      )}

      {selected && !isRoot && <SelectionFrame nodeId={node.id} />}
    </div>
  );
}

function ContainerInner({ node, depth }: { node: ComponentNode; depth: number }) {
  const padding = numProp(node.staticProps["padding"], 12);
  const bg = strProp(node.staticProps["bg"], "");
  const empty = node.children.length === 0;
  const addComponent = useStore((s) => s.addComponent);
  const moveComponent = useStore((s) => s.moveComponent);
  const setSelected = useStore((s) => s.setSelectedComponent);

  const style: CSSProperties = {
    ...layoutToCSS(node.layout),
    padding,
    background: bg || undefined,
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    minHeight: 60,
    position: "relative",
  };

  const axis = node.layout.kind === "flex" ? node.layout.direction : "column";

  // Fallback drop on the container body itself: appends at the end.
  function onBodyDrop(e: React.DragEvent): void {
    if ((e.target as HTMLElement).closest(".design-drop-slot")) return;
    e.preventDefault();
    e.stopPropagation();
    document.body.classList.remove("is-dragging-component");
    const payload = parseDrag(e);
    if (!payload) return;
    const idx = node.children.length;
    if (payload.kind === "new") setSelected(addComponent(node.id, payload.cls, idx).id);
    else moveComponent(payload.nodeId, node.id, idx);
  }

  return (
    <div
      className="dc-container-body"
      style={style}
      onDragOver={(e) => { if (dragHasPayload(e)) { e.preventDefault(); e.dataTransfer.dropEffect = e.dataTransfer.types.includes(DRAG_NEW) ? "copy" : "move"; } }}
      onDrop={onBodyDrop}
    >
      {empty ? (
        <DropSlot parentId={node.id} index={0} fill />
      ) : (
        <>
          <DropSlot parentId={node.id} index={0} axis={axis} />
          {node.children.map((child, i) => (
            <Fragment key={child.id}>
              <Node node={child} depth={depth + 1} />
              <DropSlot
                parentId={node.id}
                index={i + 1}
                axis={axis}
                grow={i === node.children.length - 1}
              />
            </Fragment>
          ))}
        </>
      )}
      {empty && <span className="dc-empty-hint">drop here</span>}
    </div>
  );
}

interface DropSlotProps {
  parentId: string;
  index: number;
  axis?: "row" | "column";
  fill?: boolean;
  grow?: boolean;
}

function DropSlot({ parentId, index, axis = "column", fill, grow }: DropSlotProps) {
  const [over, setOver] = useState(false);
  const addComponent = useStore((s) => s.addComponent);
  const moveComponent = useStore((s) => s.moveComponent);
  const setSelected = useStore((s) => s.setSelectedComponent);

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    document.body.classList.remove("is-dragging-component");
    const payload = parseDrag(e);
    if (!payload) return;
    if (payload.kind === "new") {
      const node = addComponent(parentId, payload.cls, index);
      setSelected(node.id);
    } else {
      moveComponent(payload.nodeId, parentId, index);
    }
  }

  return (
    <div
      className={`design-drop-slot ${axis} ${fill ? "fill" : ""} ${grow ? "grow" : ""} ${over ? "over" : ""}`}
      onDragEnter={(e) => { if (dragHasPayload(e)) { e.preventDefault(); setOver(true); } }}
      onDragOver={(e) => {
        if (!dragHasPayload(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = e.dataTransfer.types.includes(DRAG_NEW) ? "copy" : "move";
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
    />
  );
}

// ── Style helpers ──────────────────────────────────────────────────────────

function rootStyle(): CSSProperties {
  // Root always fills the design frame so users see a real canvas, not a
  // 48px strip at the top. Children below the root keep behaving normally.
  return { width: "100%", height: "100%", display: "flex" };
}

function bufferStyle(node: ComponentNode): CSSProperties {
  const grow = numProp(node.staticProps["grow"], 1);
  const size = numProp(node.staticProps["size"], 16);
  return {
    flex: `${grow} 0 ${size}px`,
    alignSelf: "stretch",
    minWidth: size,
    minHeight: size,
  };
}

function makeRenderCtx(id: string, selected: boolean) {
  return {
    isSelected: selected,
    onSelect: (_id: string) => { /* handled by Node wrapper */ },
    onDrop: (_parentId: string, _cls: import("../../types").ComponentClass, _index: number) => { /* handled by DropSlot */ },
    selectedId: selected ? id : null,
  };
}

function numProp(v: JSONValue | undefined, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function strProp(v: JSONValue | undefined, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}
function shortId(id: string): string {
  const i = id.indexOf("_");
  return i < 0 ? id : id.slice(i + 1, i + 7);
}
