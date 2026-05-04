// Single source of truth for design-canvas drag-and-drop MIME types.
// Every drop handler in the designer must go through `parseDrag` so we
// don't scatter string literals across the codebase.

import type { ComponentClass } from "../../types";

export const DRAG_NEW = "visualis/component";   // dragging a class out of the palette
export const DRAG_MOVE = "visualis/move";       // dragging an existing node by id

export type DragPayload =
  | { kind: "new"; cls: ComponentClass }
  | { kind: "move"; nodeId: string };

export function setDragNew(e: React.DragEvent, cls: ComponentClass): void {
  e.dataTransfer.setData(DRAG_NEW, cls);
  e.dataTransfer.effectAllowed = "copy";
}

export function setDragMove(e: React.DragEvent, nodeId: string): void {
  e.dataTransfer.setData(DRAG_MOVE, nodeId);
  e.dataTransfer.effectAllowed = "move";
}

export function parseDrag(e: React.DragEvent): DragPayload | null {
  const cls = e.dataTransfer.getData(DRAG_NEW);
  if (cls) return { kind: "new", cls: cls as ComponentClass };
  const nodeId = e.dataTransfer.getData(DRAG_MOVE);
  if (nodeId) return { kind: "move", nodeId };
  return null;
}

// Lightweight check at dragOver time; dataTransfer.types is the only
// thing readable while dragging (values are not).
export function dragHasPayload(e: React.DragEvent): boolean {
  const t = e.dataTransfer.types;
  return t.includes(DRAG_NEW) || t.includes(DRAG_MOVE);
}
