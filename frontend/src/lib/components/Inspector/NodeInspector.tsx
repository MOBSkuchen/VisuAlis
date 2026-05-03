import type { Action, ActionNode, PureOp, WorkflowType } from "../../types";
import { useStore } from "../../store";
import { typeLabel } from "../../types";

interface Props {
  node: ActionNode;
  action: Action;
}

const PURE_OPS: PureOp[] = [
  "concat", "add", "sub", "mul", "div",
  "eq", "neq", "lt", "gt",
  "and", "or", "not",
  "to_string", "json_parse", "json_stringify", "len",
];

const TYPE_OPTIONS: { label: string; value: WorkflowType }[] = [
  { label: "string", value: { kind: "string" } },
  { label: "number (int)", value: { kind: "int" } },
  { label: "number (float)", value: { kind: "float" } },
  { label: "boolean", value: { kind: "bool" } },
  { label: "any", value: { kind: "any" } },
];

export function NodeInspector({ node, action }: Props) {
  const setTweakValue = useStore((s) => s.setTweakValue);
  const setConstantType = useStore((s) => s.setConstantType);
  const setConstantValue = useStore((s) => s.setConstantValue);
  const setLoopItemType = useStore((s) => s.setLoopItemType);
  const setPureOp = useStore((s) => s.setPureOp);
  const pages = useStore((s) => s.project.pages);

  function tweak(key: string, value: unknown) {
    setTweakValue(action.id, node.id, key, value);
  }

  return (
    <div className="inspector">
      <div className="inspector-section">
        <div className="inspector-label">{node.kind.replace(/_/g, " ")}</div>
        <div className="inspector-id">{node.id}</div>
      </div>

      {node.kind === "origin" && (
        <OriginInspector node={node} action={action} />
      )}

      {node.kind === "constant" && (
        <div className="inspector-section">
          <div className="inspector-label">Constant</div>
          <div className="field-row">
            <label>Type</label>
            <select
              value={typeLabel(node.constantType ?? { kind: "string" })}
              onChange={(e) => {
                const opt = TYPE_OPTIONS.find((o) => typeLabel(o.value) === e.target.value);
                if (opt) setConstantType(action.id, node.id, opt.value);
              }}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={typeLabel(o.value)} value={typeLabel(o.value)}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <label>Value</label>
            <input
              value={String(node.constantValue ?? "")}
              onChange={(e) => setConstantValue(action.id, node.id, e.target.value)}
            />
          </div>
        </div>
      )}

      {node.kind === "pure" && (
        <div className="inspector-section">
          <div className="inspector-label">Operation</div>
          <select
            value={node.pureOp ?? ""}
            onChange={(e) => setPureOp(action.id, node.id, e.target.value as PureOp)}
          >
            <option value="">— select —</option>
            {PURE_OPS.map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>
      )}

      {node.kind === "loop" && (
        <div className="inspector-section">
          <div className="inspector-label">Item type</div>
          <select
            value={typeLabel(node.loopItemType ?? { kind: "any" })}
            onChange={(e) => {
              const opt = TYPE_OPTIONS.find((o) => typeLabel(o.value) === e.target.value);
              if (opt) setLoopItemType(action.id, node.id, opt.value);
            }}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={typeLabel(o.value)} value={typeLabel(o.value)}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {node.kind === "fetch" && (
        <div className="inspector-section">
          <div className="inspector-label">Method</div>
          <select
            value={String(node.tweakValues["method"] ?? "GET")}
            onChange={(e) => tweak("method", e.target.value)}
          >
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      )}

      {(node.kind === "get_value" || node.kind === "set_value") && (
        <GetSetInspector node={node} action={action} />
      )}

      {node.kind === "redirect" && (
        <div className="inspector-section">
          <div className="inspector-label">Redirect target</div>
          <div className="field-row">
            <label>Mode</label>
            <select
              value={String(node.tweakValues["target"] ?? "page")}
              onChange={(e) => tweak("target", e.target.value)}
            >
              <option value="page">Page</option>
              <option value="url">URL (dynamic)</option>
            </select>
          </div>
          {node.tweakValues["target"] !== "url" && (
            <div className="field-row">
              <label>Page</label>
              <select
                value={String(node.tweakValues["pagePath"] ?? "")}
                onChange={(e) => tweak("pagePath", e.target.value)}
              >
                <option value="">— select —</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.path}>{p.title} ({p.path})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OriginInspector({ action }: { node: ActionNode; action: Action }) {
  const addParam = useStore((s) => s.addParam);
  const removeParam = useStore((s) => s.removeParam);

  function handleAddParam() {
    const name = prompt("Param name:");
    if (!name) return;
    addParam(action.id, { name, type: { kind: "any" } });
  }

  return (
    <div className="inspector-section">
      <div className="inspector-label">Params</div>
      {action.params.map((p) => (
        <div key={p.name} className="field-row">
          <span style={{ flex: 1, fontFamily: "monospace", fontSize: 11 }}>{p.name}: {typeLabel(p.type)}</span>
          <button
            className="danger"
            style={{ padding: "2px 6px", fontSize: 10 }}
            onClick={() => removeParam(action.id, p.name)}
          >
            ✕
          </button>
        </div>
      ))}
      <button onClick={handleAddParam} style={{ marginTop: 4 }}>+ Add param</button>
    </div>
  );
}

function GetSetInspector({ node, action }: { node: ActionNode; action: Action }) {
  const setTweakValue = useStore((s) => s.setTweakValue);
  const pages = useStore((s) => s.project.pages);
  const currentPageId = useStore((s) => s.currentPageId);
  const page = pages.find((p) => p.id === currentPageId);

  function collectIds(root: import("../../types").ComponentNode): string[] {
    return [root.id, ...root.children.flatMap(collectIds)];
  }

  const componentIds = page ? collectIds(page.root) : [];

  const selectedId = String(node.tweakValues["componentId"] ?? "");

  function tweak(key: string, value: unknown) {
    setTweakValue(action.id, node.id, key, value);
  }

  return (
    <div className="inspector-section">
      <div className="inspector-label">Component</div>
      <select value={selectedId} onChange={(e) => tweak("componentId", e.target.value)}>
        <option value="">— select —</option>
        {componentIds.map((id) => (
          <option key={id} value={id}>{id}</option>
        ))}
      </select>
      {node.kind === "set_value" && selectedId && (
        <SetFieldPicker node={node} action={action} componentId={selectedId} />
      )}
    </div>
  );
}

function SetFieldPicker({
  node,
  action,
  componentId,
}: {
  node: ActionNode;
  action: Action;
  componentId: string;
}) {
  const setTweakValue = useStore((s) => s.setTweakValue);
  const pages = useStore((s) => s.project.pages);
  const currentPageId = useStore((s) => s.currentPageId);

  function findNode(root: import("../../types").ComponentNode, id: string): import("../../types").ComponentNode | null {
    if (root.id === id) return root;
    for (const c of root.children) { const f = findNode(c, id); if (f) return f; }
    return null;
  }

  const page = pages.find((p) => p.id === currentPageId);
  const compNode = page ? findNode(page.root, componentId) : null;
  const fields = compNode ? Object.keys(compNode.variableProps) : [];

  return (
    <div className="field-row" style={{ marginTop: 4 }}>
      <label>Field</label>
      <select
        value={String(node.tweakValues["field"] ?? "")}
        onChange={(e) => setTweakValue(action.id, node.id, "field", e.target.value)}
      >
        <option value="">— select —</option>
        {fields.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
    </div>
  );
}
