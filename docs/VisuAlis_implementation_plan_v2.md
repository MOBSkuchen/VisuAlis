# VisuAlis — Strict Implementation Plan (v2)

Authoritative spec. No decisions remain. Every "MUST" is binding.

## 0. Stack

- Workspace: Cargo workspace at repo root with members `compiler/`, `backend/`. Frontend at `frontend/` (npm, not in Cargo workspace).
- Backend: Rust + Axum + Tokio + serde + sqlx (SQLite). Port `7979`.
- Compiler: Rust library crate. Public API only — never invoked from CLI.
- Frontend: Vite + React 18 + TypeScript + Zustand + `@xyflow/react` + `react-router-dom@6`.
- Compile target: React 18 SPA built with Vite, output zipped buildable project.
- Animations: `framer-motion` (page transitions, component mount/hover only).
- Lint/format: `cargo fmt`, `cargo clippy -- -D warnings`, `eslint` (recommended + react), `prettier`.

## 1. Repo layout (final)

```
VisuAlis/
  Cargo.toml                       # workspace = ["compiler", "backend"]
  compiler/
    Cargo.toml
    src/
      lib.rs                       # pub fn compile(ast, opts) -> Result<Workspace>
      ast.rs                       # serde types (mirrors frontend ./lib/types.ts)
      typecheck.rs                 # validate ast before emit
      emit/
        mod.rs                     # orchestrator
        page.rs                    # one TSX file per page
        action.rs                  # one TS function per action
        component.rs               # JSX for a Component instance
        expr.rs                    # data-edge resolver, lazy pure node inlining
        runtime.rs                 # emit src/runtime/* (GetValue/SetValue/Fetch helpers)
      project.rs                   # scaffold package.json, vite.config, tsconfig, router
      workspace.rs                 # in-memory FS map -> zip bytes
  backend/
    Cargo.toml
    src/
      main.rs
      router.rs
      db.rs                        # sqlx pool, migrations
      projects.rs                  # CRUD
      compile.rs                   # POST /compile -> zip
      error.rs
    migrations/
      0001_init.sql
  frontend/
    package.json
    vite.config.ts
    tsconfig.json
    index.html
    src/
      main.tsx
      App.tsx
      app.css
      lib/
        types.ts                   # see §3
        store.ts                   # zustand: project, currentPageId, currentActionId, selection
        api.ts                     # backend client (fetch wrappers)
        typecheck.ts               # adapted from automation/frontend
        registry.ts                # builtin components + extension hook
        codegen-preview.ts         # optional client-side preview only
        components/
          Toolbar.tsx
          Palette.tsx              # tab: Components | Nodes
          Canvas/
            DesignCanvas.tsx       # page-design surface (flex containers)
            FlowCanvas.tsx         # action node graph (React Flow)
          Inspector/
            Inspector.tsx          # right panel switch by selection
            ComponentInspector.tsx
            NodeInspector.tsx
            PageInspector.tsx
          PageList.tsx
          ActionList.tsx
          nodes/                   # React Flow node renderers
            OriginNode.tsx
            TerminateNode.tsx
            BranchNode.tsx
            LoopNode.tsx
            FetchNode.tsx
            GetValueNode.tsx
            SetValueNode.tsx
            RedirectNode.tsx
            ConstantNode.tsx
            PureNode.tsx
          components/              # design-time renderers per component class
            TextInputC.tsx
            FileUploadC.tsx
            DropdownC.tsx
            CheckboxC.tsx
            StaticTextC.tsx
            VideoC.tsx
            TableC.tsx
            ButtonC.tsx
            ContainerC.tsx
  docs/
    VisuAlis_implementation.md
    VisuAlis_implementation_plan_v2.md   # this file
```

## 2. Adopted-from-AuTomato (verbatim, then adapt)

Copy from `../automation/frontend/src/lib/`:
- `typecheck.ts` — keep; identical type lattice.
- store patterns from `store.ts` — adapt schema (no Workflow; use Project).
- React Flow integration from `components/Canvas.tsx` — strip `usedModules`, keep exec/data edge logic, `isValidConnection`, `originReachable`, drop module DnD path, keep node-kind dispatch.
- exec/data edge model + `EXEC_*` / passthrough / dispatch constants from `types.ts`.

Discard: module registry sync, `__construct__/__destruct__` from palette (custom types not exposed in v1; types.ts keeps the kinds for compiler reuse), `EnvConst`, `__error__` semantics on modules (replaced by `Fetch` error exec).

## 3. Domain model (`frontend/src/lib/types.ts` — also mirror `compiler/src/ast.rs`)

```ts
type Project = {
  id: string;
  name: string;
  version: string;          // "0.1.0"
  pages: Page[];
  actions: Action[];        // shared across pages, referenced by id
  customTypes: CustomTypeDef[];   // reserved; empty in v1
};

type Page = {
  id: string;
  path: string;             // "/home", must start with "/", unique
  title: string;
  root: ContainerNode;      // tree of design-time components
};

type ComponentClass =
  | "container" | "text_input" | "file_upload" | "dropdown" | "checkbox"
  | "static_text" | "video" | "table" | "button";

type ComponentNode = {
  id: string;               // unique within project, stable, used by GetValue/SetValue
  cls: ComponentClass;
  staticProps: Record<string, JSONValue>;   // baked at build (color, label, options...)
  variableProps: Record<string, JSONValue>; // runtime defaults; mutable via SetValue
  triggers: Record<string, string | null>;  // event name -> actionId
  children?: ComponentNode[]; // only for containers
  layout: { kind: "flex"; direction: "row"|"column"; gap: number; align: string; justify: string }
        | { kind: "grid"; columns: number; gap: number };
  // ContainerNode is ComponentNode where cls === "container".
};

type Action = {
  id: string;
  name: string;
  params: Param[];          // emitted by Origin node
  graph: { nodes: ActionNode[]; edges: ActionEdge[] };
};

type Param = { name: string; type: WorkflowType };

// Reuse WorkflowType, EdgeKind, NodeKind, exec ports verbatim from AuTomato types.ts.
```

`NodeKind` for v1: `"origin" | "terminate" | "branch" | "loop" | "constant" | "fetch" | "get_value" | "set_value" | "redirect" | "pure"`.

`pure` covers builtins below; tagged by `pureOp`.
`pureOp ∈ { "concat", "add", "sub", "mul", "div", "eq", "neq", "lt", "gt", "and", "or", "not", "to_string", "json_parse", "json_stringify", "len" }`.

## 4. Component catalog (v1, fixed; registry is extensible)

| cls          | tag          | staticProps                         | variableProps        | triggers                |
|--------------|--------------|-------------------------------------|----------------------|-------------------------|
| container    | `<div>`      | layout, padding, bg                 | —                    | —                       |
| text_input   | `<input>`    | placeholder, type=text/password     | value, disabled      | onChange, onBlur        |
| file_upload  | `<input file>` | accept, multiple                  | files (read-only)    | onChange                |
| dropdown     | `<select>`   | options[]                           | value, disabled      | onChange                |
| checkbox     | `<input cb>` | label                               | checked, disabled    | onChange                |
| static_text  | `<p>/<h*>`   | text, level (p/h1..h6)              | text                 | —                       |
| video        | `<video>`    | src, controls, loop                 | playing              | onPlay, onPause, onEnded|
| table        | `<table>`    | columns[]                           | rows[]               | onRowClick              |
| button       | `<button>`   | label                               | disabled             | onClick                 |

Registry shape (`registry.ts`):
```ts
export interface ComponentSpec {
  cls: ComponentClass;
  tag: string;
  staticProps: PropSpec[];
  variableProps: PropSpec[];
  triggers: TriggerSpec[];          // event name + arg types passed to action
  render: (n: ComponentNode, ctx) => ReactNode; // design-time
  emit: (n: ComponentNode, ctx) => string;      // codegen JSX string
}
export const REGISTRY: Record<ComponentClass, ComponentSpec>;
```
Adding a component MUST require only: register a spec + add a renderer + add `cls` to the union. No other file may switch on `cls`.

## 5. Frontend — phases

### Phase F1 — Bootstrap
- `npm create vite@latest frontend -- --template react-ts`.
- Install deps from §0.
- Copy `automation/frontend/src/app.css` → `frontend/src/app.css`; rename `--accent` palette as desired.
- Set up React Router with three top-level routes inside the editor: `/editor` (default), `/editor/page/:pageId`, `/editor/action/:actionId`. The compiled output uses its own router (different paths).

### Phase F2 — Adopt graph engine
- Port `typecheck.ts`, exec-port helpers, `store.ts` skeleton from AuTomato. Replace `Workflow` with `Project + Action`; the active graph is `useStore(s => s.project.actions.find(a => a.id === s.currentActionId)?.graph)`.
- Port `Canvas.tsx` → `FlowCanvas.tsx`. Strip module DnD branch; nodes are dropped from a node palette with fixed `NodeKind`s.

### Phase F3 — Component design canvas
- `DesignCanvas.tsx`: renders `currentPage.root` recursively. NO absolute positioning. NO React Flow here.
- DnD: HTML5 drag-and-drop from `Palette` (Components tab) into containers. Drop indicator between siblings.
- Selection: clicking a component sets `selectedComponentId`. Inspector shows static + variable props + trigger bindings.
- Reordering: drag inside container; arrow buttons in inspector as fallback.
- All updates go through `store` actions; no direct mutation.

### Phase F4 — Inspector & action binding
- `ComponentInspector.tsx` shows: ID (read-only, copyable), class, static-prop fields (typed inputs from `ComponentSpec.staticProps`), variable-prop fields (defaults), trigger pickers (dropdown listing all `Action`s + "+ New action" creating an empty Action and switching the route).
- `ActionInspector` (when on `/editor/action/:id`) edits action name and params (renders Origin outputs).
- `PageInspector` edits `path` and `title`.

### Phase F5 — Action graph builtins
Each builtin lives in `components/nodes/`. Type signatures (strict):

- **Origin** (kind=`origin`, category=trigger): outputs = action params (event-typed). Exactly one per action.
- **Terminate** (kind=`terminate`, category=return): exec-in only. Emits `return;`.
- **Branch**: data input `condition: bool`; exec out `__true__`, `__false__`.
- **Loop**: data input `iter: array<any>`; data output `item`; exec `__body__`, `__done__`.
- **Constant**: pure; one data output of chosen type.
- **Fetch** (kind=`fetch`, category=action): tweaks `method` (dropdown GET/POST/PUT/PATCH/DELETE), data inputs `url:string`, `headers:dict<string>` (optional), `body:string` (optional). Outputs `status:int`, `body:string`, `json:any`. Exec out `__out__` (success), `__err__` (network/parse). Compiles to `await`.
- **GetValue**: tweak `id` (dropdown of component IDs in *current page*); output `value:any`; exec out `__out__` (found), `__err__` (NOT FOUND).
- **SetValue**: tweaks `id` (dropdown), `field` (dropdown of that component's variableProps); data input `value:any`; exec out `__out__`, `__err__` (NOT FOUND).
- **Redirect**: tweak `target` ∈ `{page, url}`; if `page`: dropdown of `Page.path`; if `url`: data input `url:string`. No outputs.
- **Pure**: any expression-only op from §3 list.

Dropdowns in tweaks MUST be populated from `useStore` selectors so they update live.

### Phase F6 — Persistence
- Backend client `api.ts`: `listProjects`, `getProject(id)`, `saveProject(project)`, `compile(projectId) -> blob`.
- Autosave: debounced 800ms after any store mutation; status indicator in toolbar.
- localStorage holds last-opened projectId + UI state only; project data is server-authoritative.

### Phase F7 — Animations (limited)
- Page route transitions inside the editor: 150ms fade.
- Newly added component on canvas: 120ms scale 0.96→1, opacity 0→1.
- Hover lift on buttons in palette/toolbar (CSS only, no framer).
- No other animations.

## 6. Compiler — phases

### Phase C1 — AST mirror & validation
- `ast.rs` mirrors §3 exactly with serde. Reject extra fields (`#[serde(deny_unknown_fields)]`).
- `typecheck.rs`:
  - Each Page: unique `path`; valid pattern `^/[a-z0-9/_-]*$`.
  - Each Component ID unique project-wide.
  - Each Action graph: exactly one Origin, ≥1 Terminate (or every exec leaf is Terminate/Redirect).
  - Reuse exec/data discipline from AuTomato `compiler/src/typecheck.rs` (1-out exec, consumed-no-fan, type compat).
  - Trigger bindings: every `triggers[event]` references an existing action; param count/types of action match the trigger's event signature declared in registry.

### Phase C2 — Action lowering
`emit/action.rs` walks exec from Origin (mirrors AuTomato `emit.rs`):
- Variables: `var_<sanitized-id>_<port>`; promise results awaited inline.
- Action becomes `async function action_<id>(<params>): Promise<void>`.
- Branch → `if (cond) { ... } else { ... }`.
- Loop → `for (const var_<id>_item of arr) { ... }`.
- Fetch → `const r = await runtime.fetch({...}); ` then on `__err__` branch use `r.error`.
- GetValue/SetValue → calls `runtime.getValue(id)` / `runtime.setValue(id, field, value)` which throw on NOT FOUND, caught into the `__err__` exec.
- Redirect → `runtime.redirect(...)`.
- Constant → inlined literal at first use.
- Pure → inlined expression.

### Phase C3 — Page lowering
`emit/page.rs`:
- One file `src/pages/<PageName>.tsx` per page. PageName = PascalCase of path segments joined.
- Walk component tree recursively via `component.rs`. Each component renders to JSX using its registry `emit`.
- Variable props are lifted into `useState` per component instance (`const [<id>__<prop>, set_<id>__<prop>] = useState(<default>);`).
- Trigger bindings emit `onEvent={(e)=>action_<id>(<event-derived-args>)}`.
- The component's runtime ID handle is registered via `useEffect(() => runtime.register('<id>', { get, set }), [])`.

### Phase C4 — Project scaffold
`project.rs` writes:
```
package.json                         # react, react-dom, react-router-dom, vite, typescript
vite.config.ts
tsconfig.json
index.html
src/
  main.tsx                           # creates BrowserRouter, mounts <App/>
  App.tsx                            # <Routes> mapping each Page.path -> page component
  runtime/
    index.ts                         # registry, getValue, setValue, fetch, redirect
    fetch.ts
  pages/<Name>.tsx                   # generated
  actions/<Name>.ts                  # generated
  styles.css
README.md                            # how to `npm i && npm run build`
```
`runtime/index.ts` exports a singleton component-registry map keyed by component id.

### Phase C5 — Workspace zip
`workspace.rs` collects an in-memory `BTreeMap<PathBuf, Vec<u8>>`, then streams a zip via `zip` crate.

## 7. Backend — phases

### Phase B1 — Skeleton
Adapt `automation/backend/`:
- Routes: `GET /health`, `GET /projects`, `GET /projects/:id`, `PUT /projects/:id`, `POST /projects`, `DELETE /projects/:id`, `POST /projects/:id/compile`.
- SQLite schema (one table):
  ```
  CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    data BLOB NOT NULL                    -- the full Project as JSON
  );
  ```
- Migrations run on startup.

### Phase B2 — Compile endpoint
`POST /projects/:id/compile`:
1. Load project JSON.
2. `compiler::compile(&ast)?` → `Workspace` (zip bytes).
3. Respond `application/zip; filename="<project-name>.zip"`.

### Phase B3 — CORS / serve
- `tower-http` CORS allowing the dev frontend origin.
- In release, the backend optionally serves the editor SPA's `frontend/dist/`. Behind feature flag `embed-spa`.

## 8. Output project (compiled artifact contract)

The zip MUST produce a working app with exactly:
```sh
npm install
npm run build      # vite build -> dist/
npm run dev        # local preview
```
- Routing: each `Page.path` → React Router `<Route>`.
- Component IDs: each rendered DOM node gets `id={"<componentId>"}`.
- Variable props: backed by `useState`; SetValue triggers re-render via setter.
- Static props: passed as JSX attributes literally; never re-rendered.
- Actions: ESM modules in `src/actions/`; imported only by the page that uses them.
- No global state library in output. Cross-component reads use `runtime.getValue(id)` only.

## 9. Coding standards (binding)

- No file may switch on `ComponentClass` outside `registry.ts` and the renderers folder. Adding a component touches only those.
- No file may switch on `NodeKind` outside `components/nodes/` (frontend) or `compiler/src/emit/` (Rust). Use a registry/dispatch table.
- Frontend: no `any` in non-test code except inside `WorkflowType.kind === "any"` runtime checks. ESLint rule `@typescript-eslint/no-explicit-any: error`.
- Rust: `#![deny(warnings)]` in lib roots; `clippy::pedantic` allowed-list documented at top of each crate.
- Each emitted line of generated TS MUST come from a single `writeln!`/template — never concatenated ad-hoc strings across files.
- No backwards-compat shims (greenfield).

## 10. Build/run

```sh
# backend
cargo run -p visualis-backend          # :7979

# frontend
cd frontend && npm i && npm run dev    # :5173

# compile a project (manual)
curl -X POST http://localhost:7979/projects/<id>/compile -o out.zip
```

## 11. Phase order (binding execution order)

1. C1 (ast + typecheck shells with stub bodies).
2. B1 (backend skeleton + sqlite + project CRUD).
3. F1 → F2 (frontend bootstrap + graph engine adoption).
4. F3 → F4 (design canvas + inspectors).
5. F5 (action node palette + Origin/Terminate/Branch/Loop/Constant/Pure).
6. F6 (persistence wired to B1).
7. C2 (action lowering, generates runnable TS for hand-fed AST).
8. F5 cont. (Fetch, GetValue, SetValue, Redirect).
9. C3 + C4 (page lowering + scaffold).
10. C5 + B2 (zip + compile endpoint).
11. F7 (animations).
12. B3 (CORS + optional embed-spa).

A phase is "done" when: types compile, tests for that phase pass, and the next phase's MUST-conditions are met.

## 12. Out of scope (v1)

Auth, multi-user, theming, custom CSS, A11y audit, custom struct/enum types in UI, AuTomato backend integration (Fetch is generic HTTP, not bound to AuTomato endpoints).
