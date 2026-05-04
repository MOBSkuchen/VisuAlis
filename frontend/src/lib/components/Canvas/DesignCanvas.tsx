import { useEffect } from "react";
import { useCurrentPage, useStore } from "../../store";
import { Frame } from "./Frame";
import { ComponentTree } from "./ComponentTree";
import { Breadcrumb } from "./Breadcrumb";

function isTextTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
}

export function DesignCanvas() {
  const page = useCurrentPage();
  const setSelected = useStore((s) => s.setSelectedComponent);
  const deleteSelected = useStore((s) => s.deleteSelected);
  const copySelected = useStore((s) => s.copySelected);
  const pasteComponent = useStore((s) => s.pasteComponent);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (isTextTarget(e.target)) return;
      if (e.key === "Escape") { setSelected(null); return; }
      if (e.key === "Delete" || e.key === "Backspace") { deleteSelected(); return; }
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === "c") { copySelected(); return; }
        if (e.key === "v") { pasteComponent(); return; }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSelected, deleteSelected, copySelected, pasteComponent]);

  if (!page) {
    return (
      <div className="design-canvas-empty">
        <span className="muted">Select a page from the panel.</span>
      </div>
    );
  }

  return (
    <div className="design-canvas">
      <Breadcrumb />
      <div
        className="design-canvas-stage"
        onClick={(e) => {
          // Only clear selection if the click landed on the stage itself,
          // not on the frame, breadcrumb, or any component.
          if (e.target === e.currentTarget) setSelected(null);
        }}
      >
        <Frame>
          <ComponentTree root={page.root} />
        </Frame>
      </div>
    </div>
  );
}
