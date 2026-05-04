import { useStore, useCurrentPage } from "../../store";
import type { ComponentNode } from "../../types";
import { getSpec } from "../../registry";

// Selection breadcrumb. Click any segment to select that ancestor.

export function Breadcrumb() {
  const page = useCurrentPage();
  const selectedId = useStore((s) => s.selectedComponentId);
  const setSelected = useStore((s) => s.setSelectedComponent);

  if (!page) return null;
  const path = selectedId ? findPath(page.root, selectedId) : [page.root];

  return (
    <div className="design-breadcrumb">
      {path.map((n, i) => {
        const spec = getSpec(n.cls);
        const isLast = i === path.length - 1;
        return (
          <span key={n.id} className="design-breadcrumb-seg-wrap">
            <span
              className={`design-breadcrumb-seg ${isLast ? "current" : ""}`}
              onClick={() => setSelected(n.id)}
            >
              {spec.label}
            </span>
            {!isLast && <span className="design-breadcrumb-sep">›</span>}
          </span>
        );
      })}
    </div>
  );
}

function findPath(root: ComponentNode, id: string): ComponentNode[] {
  if (root.id === id) return [root];
  for (const c of root.children) {
    const sub = findPath(c, id);
    if (sub.length) return [root, ...sub];
  }
  return [];
}
