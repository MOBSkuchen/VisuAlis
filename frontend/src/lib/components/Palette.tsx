import { useState } from "react";
import { allSpecs } from "../registry";
import { PageList } from "./PageList";
import { ActionList } from "./ActionList";
import { NODE_REGISTRY, type NodeCategory } from "../nodeRegistry";
import type { NodeKind } from "../types";
import { useStore } from "../store";

const NODE_PALETTE_ITEMS: { kind: NodeKind; label: string }[] = [
  { kind: "terminate", label: "Terminate" },
  { kind: "branch", label: "Branch" },
  { kind: "loop", label: "Loop" },
  { kind: "constant", label: "Constant" },
  { kind: "pure", label: "Expression" },
  { kind: "fetch", label: "Fetch" },
  { kind: "get_value", label: "GetValue" },
  { kind: "set_value", label: "SetValue" },
  { kind: "redirect", label: "Redirect" },
];

const CATEGORY_ORDER: NodeCategory[] = ["return", "logic", "pure", "action"];
const CATEGORY_LABEL: Record<NodeCategory, string> = {
  trigger: "Trigger",
  return: "Control",
  logic: "Logic",
  pure: "Pure",
  action: "Action",
};

type Tab = "pages" | "components" | "nodes" | "actions";

export default function Palette() {
  const [tab, setTab] = useState<Tab>("pages");
  const currentActionId = useStore((s) => s.currentActionId);

  const activeTab: Tab = currentActionId ? (tab === "nodes" ? "nodes" : tab) : tab;

  return (
    <div className="panel">
      <div className="panel-tabs">
        {!currentActionId && (
          <div
            className={`panel-tab ${activeTab === "pages" ? "active" : ""}`}
            onClick={() => setTab("pages")}
          >
            Pages
          </div>
        )}
        {!currentActionId && (
          <div
            className={`panel-tab ${activeTab === "components" ? "active" : ""}`}
            onClick={() => setTab("components")}
          >
            Components
          </div>
        )}
        <div
          className={`panel-tab ${activeTab === "actions" ? "active" : ""}`}
          onClick={() => setTab("actions")}
        >
          Actions
        </div>
        {currentActionId && (
          <div
            className={`panel-tab ${activeTab === "nodes" ? "active" : ""}`}
            onClick={() => setTab("nodes")}
          >
            Nodes
          </div>
        )}
      </div>

      <div className="panel-body">
        {activeTab === "pages" && <PageList />}
        {activeTab === "components" && !currentActionId && <ComponentPalette />}
        {activeTab === "actions" && <ActionList />}
        {activeTab === "nodes" && currentActionId && <NodePalette />}
      </div>
    </div>
  );
}

function ComponentPalette() {
  const specs = allSpecs();

  return (
    <div>
      {specs.map((spec) => (
        <div
          key={spec.cls}
          className="palette-item"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("visualis/component", spec.cls);
            e.dataTransfer.effectAllowed = "copy";
            document.body.classList.add("is-dragging-component");
          }}
          onDragEnd={() => document.body.classList.remove("is-dragging-component")}
        >
          <span className="palette-item-icon" />
          {spec.label}
        </div>
      ))}
    </div>
  );
}

function NodePalette() {
  const grouped: Record<NodeCategory, { kind: NodeKind; label: string }[]> = {
    trigger: [],
    return: [],
    logic: [],
    pure: [],
    action: [],
  };
  for (const item of NODE_PALETTE_ITEMS) {
    const cat = NODE_REGISTRY[item.kind].category;
    grouped[cat].push(item);
  }

  return (
    <div>
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        return (
          <div key={cat}>
            <div className="panel-section-header">{CATEGORY_LABEL[cat]}</div>
            {items.map(({ kind, label }) => (
              <div
                key={kind}
                className="palette-item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("visualis/node", kind);
                  e.dataTransfer.effectAllowed = "copy";
                }}
              >
                <span className={`palette-item-icon cat-${cat}`} />
                {label}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
