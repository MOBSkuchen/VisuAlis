import {
    ReactFlow,
    Controls,
    Background,
    MiniMap,
    useReactFlow,
    type Node,
    type Edge as FlowEdge,
    type IsValidConnection,
    type OnConnect,
    type NodeChange,
    type EdgeChange,
    type NodeMouseHandler,
    type EdgeMouseHandler, BackgroundVariant,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore, useCurrentAction, useCurrentGraph } from "../../store";
import { resolvePortType } from "../../nodeRegistry";
import { canConnect } from "../../typecheck";
import {
  isExecPort,
  EXEC_IN,
  EXEC_ERR,
  type NodeKind,
} from "../../types";

import OriginNode from "../nodes/OriginNode";
import TerminateNode from "../nodes/TerminateNode";
import BranchNode from "../nodes/BranchNode";
import LoopNode from "../nodes/LoopNode";
import ConstantNode from "../nodes/ConstantNode";
import PureNode from "../nodes/PureNode";
import FetchNode from "../nodes/FetchNode";
import GetValueNode from "../nodes/GetValueNode";
import SetValueNode from "../nodes/SetValueNode";
import RedirectNode from "../nodes/RedirectNode";

const nodeTypes = {
  origin: OriginNode,
  terminate: TerminateNode,
  branch: BranchNode,
  loop: LoopNode,
  constant: ConstantNode,
  pure: PureNode,
  fetch: FetchNode,
  get_value: GetValueNode,
  set_value: SetValueNode,
  redirect: RedirectNode,
};

export function FlowCanvas() {
  const action = useCurrentAction();
  const graph = useCurrentGraph();
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const setSelected = useStore((s) => s.setSelectedNode);
  const moveNode = useStore((s) => s.moveActionNode);
  const removeNode = useStore((s) => s.removeActionNode);
  const addEdge = useStore((s) => s.addActionEdge);
  const removeEdge = useStore((s) => s.removeActionEdge);
  const addActionNode = useStore((s) => s.addActionNode);

  const { screenToFlowPosition } = useReactFlow();
  const [invalid, setInvalid] = useState<string | null>(null);
  const invalidTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashInvalid = useCallback((msg: string) => {
    setInvalid(msg);
    if (invalidTimer.current) clearTimeout(invalidTimer.current);
    invalidTimer.current = setTimeout(() => setInvalid(null), 2200);
  }, []);

  useEffect(() => () => { if (invalidTimer.current) clearTimeout(invalidTimer.current); }, []);

  const nodes = useMemo<Node[]>(() => {
    if (!graph) return [];
    return graph.nodes.map((n) => ({
      id: n.id,
      type: n.kind as string,
      position: n.position,
      data: { node: n, action },
      selected: n.id === selectedNodeId,
    }));
  }, [graph, selectedNodeId, action]);

  const originReachable = useMemo(() => {
    if (!graph) return new Set<string>();
    const reachable = new Set<string>();
    const queue: string[] = [];
    for (const n of graph.nodes) {
      if (n.kind === "origin") { reachable.add(n.id); queue.push(n.id); }
    }
    while (queue.length) {
      const cur = queue.shift()!;
      for (const e of graph.edges) {
        if (e.kind === "exec" && e.from.nodeId === cur && !reachable.has(e.to.nodeId)) {
          reachable.add(e.to.nodeId);
          queue.push(e.to.nodeId);
        }
      }
    }
    return reachable;
  }, [graph]);

  const edges = useMemo<FlowEdge[]>(() => {
    if (!graph) return [];
    return graph.edges.map((e) => {
      const isExec = e.kind === "exec";
      const isErr = e.from.port === EXEC_ERR;
      const fromOrigin = isExec && originReachable.has(e.from.nodeId);
      let stroke = "var(--fg-2)";
      let dash: string | undefined;
      if (isExec) {
        stroke = isErr ? "var(--err)" : fromOrigin ? "#a78bfa" : "var(--accent)";
      } else if (isErr) {
        stroke = "var(--err)"; dash = "4 3";
      }
      return {
        id: e.id,
        source: e.from.nodeId,
        sourceHandle: e.from.port,
        target: e.to.nodeId,
        targetHandle: e.to.port,
        type: isExec ? "step" : "smoothstep",
        style: { stroke, strokeWidth: isExec ? 2.2 : 1.5, strokeDasharray: dash },
        data: { kind: e.kind },
      };
    });
  }, [graph, originReachable]);

  const isValidConnection = useCallback<IsValidConnection>(
    (conn) => {
      if (!conn.source || !conn.target || conn.source === conn.target) return false;
      const srcHandle = conn.sourceHandle ?? "";
      const tgtHandle = conn.targetHandle ?? "";
      const srcExec = isExecPort(srcHandle);
      const tgtExec = isExecPort(tgtHandle);

      if (srcExec !== tgtExec) {
        flashInvalid(srcExec ? "exec pin → exec pin only" : "data pin → data pin only");
        return false;
      }
      if (srcExec) {
        if (tgtHandle !== EXEC_IN) { flashInvalid("exec target must be the exec-in pin"); return false; }
        const used = graph?.edges.some(
          (e) => e.kind === "exec" && e.from.nodeId === conn.source && e.from.port === srcHandle,
        );
        if (used) { flashInvalid("exec output already connected"); return false; }
        return true;
      }

      const srcNode = graph?.nodes.find((n) => n.id === conn.source);
      const tgtNode = graph?.nodes.find((n) => n.id === conn.target);
      if (!srcNode || !tgtNode) return false;

      const srcType = resolvePortType(srcNode, srcHandle, "source");
      const tgtType = resolvePortType(tgtNode, tgtHandle, "target");
      if (!srcType || !tgtType) return false;
      const result = canConnect(srcType, tgtType);
      if (!result.ok) { flashInvalid(result.reason); return false; }
      return true;
    },
    [graph, flashInvalid],
  );

  const onConnect = useCallback<OnConnect>(
    (conn) => {
      if (!conn.source || !conn.target || !action) return;
      const srcHandle = conn.sourceHandle ?? "";
      const tgtHandle = conn.targetHandle ?? "";
      const kind = isExecPort(srcHandle) && isExecPort(tgtHandle) ? "exec" : "data";
      addEdge(action.id, { nodeId: conn.source, port: srcHandle }, { nodeId: conn.target, port: tgtHandle }, kind);
    },
    [addEdge, action],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!action) return;
      for (const c of changes) {
        if (c.type === "position" && c.position) moveNode(action.id, c.id, c.position);
        else if (c.type === "select") {
          if (c.selected) setSelected(c.id);
          else if (selectedNodeId === c.id) setSelected(null);
        } else if (c.type === "remove") removeNode(action.id, c.id);
      }
    },
    [action, moveNode, removeNode, setSelected, selectedNodeId],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (!action) return;
      for (const c of changes) {
        if (c.type === "remove") removeEdge(action.id, c.id);
      }
    },
    [action, removeEdge],
  );

  const onEdgeClick = useCallback<EdgeMouseHandler>(
    (_e, edge) => { if (action) removeEdge(action.id, edge.id); },
    [action, removeEdge],
  );

  const onNodeClick = useCallback<NodeMouseHandler>(
    (_e, node) => setSelected(node.id),
    [setSelected],
  );

  const onPaneClick = useCallback(() => setSelected(null), [setSelected]);

  const onDrop = useCallback(
    (ev: React.DragEvent<HTMLDivElement>) => {
      ev.preventDefault();
      if (!action) return;
      const kind = ev.dataTransfer.getData("visualis/node") as NodeKind | "";
      if (!kind) return;
      const position = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });

      if (kind === "origin") {
        const exists = graph?.nodes.some((n) => n.kind === "origin");
        if (exists) { flashInvalid("Only one Origin node per action"); return; }
      }

      const newNode = {
        id: `n_${Math.random().toString(36).slice(2, 10)}`,
        kind,
        position,
        tweakValues: {},
        literalInputs: {},
      };
      addActionNode(action.id, newNode);
      setSelected(newNode.id);
    },
    [action, graph, screenToFlowPosition, addActionNode, setSelected, flashInvalid],
  );

  const onDragOver = useCallback((ev: React.DragEvent) => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "copy";
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId && action) {
        removeNode(action.id, selectedNodeId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedNodeId, removeNode, action]);

  if (!action) {
    return (
      <div className="flow-canvas" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="muted">Select an action from the panel.</span>
      </div>
    );
  }

  return (
    <div className="flow-canvas" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        isValidConnection={isValidConnection}
        onConnect={onConnect}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
          <Background
              id="2"
              gap={100}
              color="#363533"
              variant={BackgroundVariant.Lines}
          />
        <MiniMap pannable zoomable />
      </ReactFlow>
      {invalid && <div className="invalid-banner">{invalid}</div>}
    </div>
  );
}
