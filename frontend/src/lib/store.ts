import { create } from "zustand";
import type {
  Action,
  ActionEdge,
  ActionGraph,
  ActionNode,
  ComponentClass,
  ComponentNode,
  EdgeKind,
  Page,
  Param,
  Project,
  PureOp,
  WorkflowType,
} from "./types";
import { defaultValue } from "./types";
import { defaultLayout, defaultStaticProps } from "./registry";
import { api } from "./api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LAST_PROJECT_KEY = "visualis.lastProjectId";

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function emptyGraph(): ActionGraph {
  const originId = newId("n");
  return {
    nodes: [
      {
        id: originId,
        kind: "origin",
        position: { x: 120, y: 100 },
        tweakValues: {},
        literalInputs: {},
      },
    ],
    edges: [],
  };
}

function emptyAction(name: string): Action {
  return { id: newId("a"), name, params: [], graph: emptyGraph() };
}

function emptyPage(path: string, title: string): Page {
  return {
    id: newId("p"),
    path,
    title,
    root: {
      id: newId("c"),
      cls: "container",
      staticProps: {},
      variableProps: {},
      triggers: {},
      children: [],
      layout: defaultLayout(),
    },
  };
}

function emptyProject(name: string): Project {
  return {
    id: newId("proj"),
    name,
    version: "0.1.0",
    pages: [emptyPage("/home", "Home")],
    actions: [],
    customTypes: [],
  };
}

// ─── Autosave debounce ────────────────────────────────────────────────────────

let _saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(project: Project, setSaveStatus: (s: SaveStatus) => void): void {
  if (_saveTimer) clearTimeout(_saveTimer);
  setSaveStatus("saving");
  _saveTimer = setTimeout(() => {
    void api.saveProject(project)
      .then(() => setSaveStatus("saved"))
      .catch(() => setSaveStatus("error"));
  }, 800);
}

// ─── Component tree helpers ───────────────────────────────────────────────────

function mapNode(
  node: ComponentNode,
  id: string,
  updater: (n: ComponentNode) => ComponentNode,
): ComponentNode {
  if (node.id === id) return updater(node);
  return { ...node, children: node.children.map((c) => mapNode(c, id, updater)) };
}

function removeNode(root: ComponentNode, id: string): ComponentNode {
  return {
    ...root,
    children: root.children
      .filter((c) => c.id !== id)
      .map((c) => removeNode(c, id)),
  };
}

function insertChild(
  root: ComponentNode,
  parentId: string,
  child: ComponentNode,
  index: number,
): ComponentNode {
  if (root.id === parentId) {
    const next = [...root.children];
    next.splice(index, 0, child);
    return { ...root, children: next };
  }
  return { ...root, children: root.children.map((c) => insertChild(c, parentId, child, index)) };
}

function moveChild(
  root: ComponentNode,
  id: string,
  parentId: string,
  index: number,
): ComponentNode {
  const node = findNode(root, id);
  if (!node) return root;
  const withoutNode = removeNode(root, id);
  return insertChild(withoutNode, parentId, node, index);
}

function cloneNode(node: ComponentNode): ComponentNode {
  return { ...node, id: newId("c"), children: node.children.map(cloneNode) };
}

function findParentOf(root: ComponentNode, id: string): ComponentNode | null {
  for (const child of root.children) {
    if (child.id === id) return root;
    const found = findParentOf(child, id);
    if (found) return found;
  }
  return null;
}

export function findNode(root: ComponentNode, id: string): ComponentNode | null {
  if (root.id === id) return root;
  for (const c of root.children) {
    const found = findNode(c, id);
    if (found) return found;
  }
  return null;
}

export function collectComponentIds(root: ComponentNode): string[] {
  return [root.id, ...root.children.flatMap(collectComponentIds)];
}

// ─── Store types ──────────────────────────────────────────────────────────────

export type SaveStatus = "saved" | "saving" | "error" | "idle";

export interface VisuAlisState {
  project: Project;
  currentPageId: string | null;
  currentActionId: string | null;
  selectedComponentId: string | null;
  selectedNodeId: string | null;
  saveStatus: SaveStatus;
  clipboardNode: ComponentNode | null;

  // ── Project ──
  loadProject: (project: Project) => void;
  setProjectName: (name: string) => void;

  // ── Pages ──
  addPage: (path: string, title: string) => Page;
  removePage: (id: string) => void;
  setPagePath: (id: string, path: string) => void;
  setPageTitle: (id: string, title: string) => void;
  setCurrentPage: (id: string | null) => void;

  // ── Components ──
  addComponent: (parentId: string, cls: ComponentClass, index: number) => ComponentNode;
  removeComponent: (id: string) => void;
  moveComponent: (id: string, parentId: string, index: number) => void;
  setStaticProp: (id: string, key: string, value: import("./types").JSONValue) => void;
  setVariableProp: (id: string, key: string, value: import("./types").JSONValue) => void;
  setLayout: (id: string, layout: import("./types").Layout) => void;
  setTrigger: (id: string, event: string, actionId: string | null) => void;
  setSelectedComponent: (id: string | null) => void;
  deleteSelected: () => void;
  copySelected: () => void;
  pasteComponent: () => void;

  // ── Actions ──
  addAction: (name: string) => Action;
  removeAction: (id: string) => void;
  setActionName: (id: string, name: string) => void;
  addParam: (actionId: string, param: Param) => void;
  removeParam: (actionId: string, paramName: string) => void;
  setCurrentAction: (id: string | null) => void;

  // ── Action graph nodes ──
  addActionNode: (actionId: string, node: ActionNode) => void;
  removeActionNode: (actionId: string, nodeId: string) => void;
  moveActionNode: (actionId: string, nodeId: string, position: { x: number; y: number }) => void;
  setTweakValue: (actionId: string, nodeId: string, key: string, value: unknown) => void;
  setConstantValue: (actionId: string, nodeId: string, value: unknown) => void;
  setConstantType: (actionId: string, nodeId: string, type: WorkflowType) => void;
  setLoopItemType: (actionId: string, nodeId: string, type: WorkflowType) => void;
  setPureOp: (actionId: string, nodeId: string, op: PureOp) => void;
  setSelectedNode: (id: string | null) => void;

  // ── Action graph edges ──
  addActionEdge: (
    actionId: string,
    from: { nodeId: string; port: string },
    to: { nodeId: string; port: string },
    kind: EdgeKind,
  ) => ActionEdge | null;
  removeActionEdge: (actionId: string, edgeId: string) => void;

  setSaveStatus: (status: SaveStatus) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<VisuAlisState>((set, get) => {
  function mutate(updater: (p: Project) => Project): void {
    set((s) => {
      const next = updater(s.project);
      scheduleSave(next, (status) => set({ saveStatus: status }));
      return { project: next };
    });
  }

  function mutateAction(actionId: string, updater: (a: Action) => Action): void {
    mutate((p) => ({
      ...p,
      actions: p.actions.map((a) => (a.id === actionId ? updater(a) : a)),
    }));
  }

  function mutateGraph(actionId: string, updater: (g: ActionGraph) => ActionGraph): void {
    mutateAction(actionId, (a) => ({ ...a, graph: updater(a.graph) }));
  }

  function mutatePage(pageId: string, updater: (page: Page) => Page): void {
    mutate((p) => ({
      ...p,
      pages: p.pages.map((page) => (page.id === pageId ? updater(page) : page)),
    }));
  }

  const initialProject = emptyProject("Untitled Project");
  const initialPageId = initialProject.pages[0]?.id ?? null;

  return {
    project: initialProject,
    currentPageId: initialPageId,
    currentActionId: null,
    selectedComponentId: null,
    selectedNodeId: null,
    saveStatus: "idle",
    clipboardNode: null,

    loadProject: (project) => {
      localStorage.setItem(LAST_PROJECT_KEY, project.id);
      set({
        project,
        currentPageId: project.pages[0]?.id ?? null,
        currentActionId: null,
        selectedComponentId: null,
        selectedNodeId: null,
        saveStatus: "saved",
      });
    },

    setProjectName: (name) => mutate((p) => ({ ...p, name })),

    // ── Pages ──────────────────────────────────────────────────────────────

    addPage: (path, title) => {
      const page = emptyPage(path, title);
      mutate((p) => ({ ...p, pages: [...p.pages, page] }));
      return page;
    },

    removePage: (id) => {
      mutate((p) => ({ ...p, pages: p.pages.filter((pg) => pg.id !== id) }));
      if (get().currentPageId === id) set({ currentPageId: null, selectedComponentId: null });
    },

    setPagePath: (id, path) => mutatePage(id, (pg) => ({ ...pg, path })),
    setPageTitle: (id, title) => mutatePage(id, (pg) => ({ ...pg, title })),
    setCurrentPage: (id) => set({ currentPageId: id, selectedComponentId: null }),

    // ── Components ─────────────────────────────────────────────────────────

    addComponent: (parentId, cls, index) => {
      const node: ComponentNode = {
        id: newId("c"),
        cls,
        staticProps: defaultStaticProps(cls),
        variableProps: {},
        triggers: {},
        children: [],
        layout: defaultLayout(),
      };
      const pageId = get().currentPageId;
      if (pageId) {
        mutatePage(pageId, (pg) => ({
          ...pg,
          root: insertChild(pg.root, parentId, node, index),
        }));
      }
      return node;
    },

    removeComponent: (id) => {
      const pageId = get().currentPageId;
      if (pageId) {
        mutatePage(pageId, (pg) => ({ ...pg, root: removeNode(pg.root, id) }));
      }
      if (get().selectedComponentId === id) set({ selectedComponentId: null });
    },

    moveComponent: (id, parentId, index) => {
      const pageId = get().currentPageId;
      if (pageId) {
        mutatePage(pageId, (pg) => ({ ...pg, root: moveChild(pg.root, id, parentId, index) }));
      }
    },

    setStaticProp: (id, key, value) => {
      const pageId = get().currentPageId;
      if (!pageId) return;
      mutatePage(pageId, (pg) => ({
        ...pg,
        root: mapNode(pg.root, id, (n) => ({
          ...n,
          staticProps: { ...n.staticProps, [key]: value },
        })),
      }));
    },

    setVariableProp: (id, key, value) => {
      const pageId = get().currentPageId;
      if (!pageId) return;
      mutatePage(pageId, (pg) => ({
        ...pg,
        root: mapNode(pg.root, id, (n) => ({
          ...n,
          variableProps: { ...n.variableProps, [key]: value },
        })),
      }));
    },

    setLayout: (id, layout) => {
      const pageId = get().currentPageId;
      if (!pageId) return;
      mutatePage(pageId, (pg) => ({
        ...pg,
        root: mapNode(pg.root, id, (n) => ({ ...n, layout })),
      }));
    },

    setTrigger: (id, event, actionId) => {
      const pageId = get().currentPageId;
      if (!pageId) return;
      mutatePage(pageId, (pg) => ({
        ...pg,
        root: mapNode(pg.root, id, (n) => ({
          ...n,
          triggers: { ...n.triggers, [event]: actionId },
        })),
      }));
    },

    setSelectedComponent: (id) => set({ selectedComponentId: id }),

    deleteSelected: () => {
      const { selectedComponentId, currentPageId, project } = get();
      if (!selectedComponentId || !currentPageId) return;
      const page = project.pages.find((p) => p.id === currentPageId);
      if (!page || page.root.id === selectedComponentId) return; // never delete root
      mutatePage(currentPageId, (pg) => ({ ...pg, root: removeNode(pg.root, selectedComponentId) }));
      set({ selectedComponentId: null });
    },

    copySelected: () => {
      const { selectedComponentId, currentPageId, project } = get();
      if (!selectedComponentId || !currentPageId) return;
      const page = project.pages.find((p) => p.id === currentPageId);
      if (!page) return;
      const node = findNode(page.root, selectedComponentId);
      if (!node || node.id === page.root.id) return;
      set({ clipboardNode: node });
    },

    pasteComponent: () => {
      const { clipboardNode, selectedComponentId, currentPageId, project } = get();
      if (!clipboardNode || !currentPageId) return;
      const page = project.pages.find((p) => p.id === currentPageId);
      if (!page) return;
      const clone = cloneNode(clipboardNode);
      // Paste into selected container, or after selected sibling, or at root end.
      if (selectedComponentId) {
        const sel = findNode(page.root, selectedComponentId);
        if (sel && sel.cls === "container") {
          mutatePage(currentPageId, (pg) => ({ ...pg, root: insertChild(pg.root, sel.id, clone, sel.children.length) }));
          set({ selectedComponentId: clone.id });
          return;
        }
        const parent = findParentOf(page.root, selectedComponentId);
        if (parent) {
          const idx = parent.children.findIndex((c) => c.id === selectedComponentId);
          mutatePage(currentPageId, (pg) => ({ ...pg, root: insertChild(pg.root, parent.id, clone, idx + 1) }));
          set({ selectedComponentId: clone.id });
          return;
        }
      }
      // Fallback: append to root
      mutatePage(currentPageId, (pg) => ({ ...pg, root: insertChild(pg.root, pg.root.id, clone, pg.root.children.length) }));
      set({ selectedComponentId: clone.id });
    },

    // ── Actions ────────────────────────────────────────────────────────────

    addAction: (name) => {
      const action = emptyAction(name);
      mutate((p) => ({ ...p, actions: [...p.actions, action] }));
      return action;
    },

    removeAction: (id) => {
      mutate((p) => ({ ...p, actions: p.actions.filter((a) => a.id !== id) }));
      if (get().currentActionId === id) set({ currentActionId: null, selectedNodeId: null });
    },

    setActionName: (id, name) => mutateAction(id, (a) => ({ ...a, name })),

    addParam: (actionId, param) => {
      mutateAction(actionId, (a) => {
        if (a.params.some((p) => p.name === param.name)) return a;
        return { ...a, params: [...a.params, param] };
      });
    },

    removeParam: (actionId, paramName) => {
      mutateAction(actionId, (a) => ({
        ...a,
        params: a.params.filter((p) => p.name !== paramName),
      }));
    },

    setCurrentAction: (id) => set({ currentActionId: id, selectedNodeId: null }),

    // ── Action graph nodes ─────────────────────────────────────────────────

    addActionNode: (actionId, node) => {
      mutateGraph(actionId, (g) => ({ ...g, nodes: [...g.nodes, node] }));
    },

    removeActionNode: (actionId, nodeId) => {
      mutateGraph(actionId, (g) => ({
        nodes: g.nodes.filter((n) => n.id !== nodeId),
        edges: g.edges.filter((e) => e.from.nodeId !== nodeId && e.to.nodeId !== nodeId),
      }));
      if (get().selectedNodeId === nodeId) set({ selectedNodeId: null });
    },

    moveActionNode: (actionId, nodeId, position) => {
      mutateGraph(actionId, (g) => ({
        ...g,
        nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
      }));
    },

    setTweakValue: (actionId, nodeId, key, value) => {
      mutateGraph(actionId, (g) => ({
        ...g,
        nodes: g.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, tweakValues: { ...n.tweakValues, [key]: value } }
            : n,
        ),
      }));
    },

    setConstantValue: (actionId, nodeId, value) => {
      mutateGraph(actionId, (g) => ({
        ...g,
        nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, constantValue: value } : n)),
      }));
    },

    setConstantType: (actionId, nodeId, type) => {
      mutateGraph(actionId, (g) => ({
        ...g,
        nodes: g.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, constantType: type, constantValue: defaultValue(type) }
            : n,
        ),
      }));
    },

    setLoopItemType: (actionId, nodeId, type) => {
      mutateGraph(actionId, (g) => ({
        ...g,
        nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, loopItemType: type } : n)),
      }));
    },

    setPureOp: (actionId, nodeId, op) => {
      mutateGraph(actionId, (g) => ({
        ...g,
        nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, pureOp: op } : n)),
      }));
    },

    setSelectedNode: (id) => set({ selectedNodeId: id }),

    // ── Action graph edges ─────────────────────────────────────────────────

    addActionEdge: (actionId, from, to, kind) => {
      const graph = get().project.actions.find((a) => a.id === actionId)?.graph;
      if (!graph) return null;

      if (kind === "exec") {
        const alreadyUsed = graph.edges.some(
          (e) => e.kind === "exec" && e.from.nodeId === from.nodeId && e.from.port === from.port,
        );
        if (alreadyUsed) return null;
      }

      const edge: ActionEdge = {
        id: newId("e"),
        from,
        to,
        kind,
      };

      mutateGraph(actionId, (g) => {
        const filtered =
          kind === "data"
            ? g.edges.filter(
                (e) => !(e.kind === "data" && e.to.nodeId === to.nodeId && e.to.port === to.port),
              )
            : g.edges;
        return { ...g, edges: [...filtered, edge] };
      });

      return edge;
    },

    removeActionEdge: (actionId, edgeId) => {
      mutateGraph(actionId, (g) => ({
        ...g,
        edges: g.edges.filter((e) => e.id !== edgeId),
      }));
    },

    setSaveStatus: (status) => set({ saveStatus: status }),
  };
});

// ─── Selectors ────────────────────────────────────────────────────────────────

export function useCurrentPage() {
  return useStore((s) =>
    s.currentPageId ? s.project.pages.find((p) => p.id === s.currentPageId) ?? null : null,
  );
}

export function useCurrentAction() {
  return useStore((s) =>
    s.currentActionId ? s.project.actions.find((a) => a.id === s.currentActionId) ?? null : null,
  );
}

export function useCurrentGraph() {
  return useStore((s) => {
    const action = s.currentActionId
      ? s.project.actions.find((a) => a.id === s.currentActionId)
      : null;
    return action?.graph ?? null;
  });
}

// Initialise from backend if last project id is stored
export async function initFromBackend(): Promise<void> {
  const lastId = localStorage.getItem(LAST_PROJECT_KEY);
  if (!lastId) return;
  try {
    const project = await api.getProject(lastId);
    useStore.getState().loadProject(project);
  } catch {
    localStorage.removeItem(LAST_PROJECT_KEY);
  }
}
