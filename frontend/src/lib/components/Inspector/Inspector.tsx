import { useStore, useCurrentPage, useCurrentAction, findNode } from "../../store";
import { ComponentInspector } from "./ComponentInspector";
import { NodeInspector } from "./NodeInspector";
import { PageInspector } from "./PageInspector";

export function Inspector() {
  const selectedComponentId = useStore((s) => s.selectedComponentId);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const page = useCurrentPage();
  const action = useCurrentAction();
  const currentActionId = useStore((s) => s.currentActionId);

  let content: React.ReactNode = (
    <div className="inspector">
      <span className="muted" style={{ fontSize: 11 }}>
        {currentActionId ? "Click a node to inspect." : "Click a component to inspect."}
      </span>
    </div>
  );

  if (!currentActionId && page && !selectedComponentId) {
    content = <PageInspector page={page} />;
  } else if (selectedComponentId && page) {
    const node = findNode(page.root, selectedComponentId);
    if (node) content = <ComponentInspector node={node} />;
  } else if (selectedNodeId && action) {
    const node = action.graph.nodes.find((n) => n.id === selectedNodeId);
    if (node) content = <NodeInspector node={node} action={action} />;
  }

  return (
    <div className="panel right">
      <div className="panel-header">Inspector</div>
      <div className="panel-body" style={{ padding: 0, overflowY: "auto" }}>
        {content}
      </div>
    </div>
  );
}
