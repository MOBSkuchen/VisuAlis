import type { ComponentNode, JSONValue, Layout } from "../../types";
import { useCurrentPage, useStore } from "../../store";
import { getSpec } from "../../registry";

interface Props { node: ComponentNode }

// User-facing terminology — no flexbox jargon. The CSS-side mapping lives in
// the small adapter tables at the top of this file; the rest of the UI
// reads/writes those friendly values.

type StackMode = "vertical" | "horizontal" | "grid";

function modeOf(layout: Layout): StackMode {
  if (layout.kind === "grid") return "grid";
  return layout.direction === "row" ? "horizontal" : "vertical";
}

const DISTRIBUTE_OPTIONS: { value: string; label: string }[] = [
  { value: "flex-start",    label: "Pack to start" },
  { value: "center",        label: "Pack to center" },
  { value: "flex-end",      label: "Pack to end" },
  { value: "space-between", label: "Spread to edges" },
  { value: "space-around",  label: "Spread evenly" },
  { value: "space-evenly",  label: "Equal gaps" },
];

const ALIGN_OPTIONS: { value: string; label: string }[] = [
  { value: "stretch",    label: "Fill cross axis" },
  { value: "flex-start", label: "Top / Left" },
  { value: "center",     label: "Middle" },
  { value: "flex-end",   label: "Bottom / Right" },
  { value: "baseline",   label: "Baseline" },
];

export function ComponentInspector({ node }: Props) {
  const setStaticProp = useStore((s) => s.setStaticProp);
  const setVariableProp = useStore((s) => s.setVariableProp);
  const setLayout = useStore((s) => s.setLayout);
  const setTrigger = useStore((s) => s.setTrigger);
  const removeComponent = useStore((s) => s.removeComponent);
  const moveComponent = useStore((s) => s.moveComponent);
  const actions = useStore((s) => s.project.actions);
  const addAction = useStore((s) => s.addAction);
  const setCurrentAction = useStore((s) => s.setCurrentAction);
  const page = useCurrentPage();

  const spec = getSpec(node.cls);
  const isContainer = node.cls === "container";
  const parentInfo = page ? findParent(page.root, node.id) : null;
  const isRoot = !parentInfo;

  function copyId(): void {
    void navigator.clipboard.writeText(node.id);
  }

  function handleTrigger(event: string, actionId: string): void {
    if (actionId === "__new__") {
      const name = prompt("Action name:", `on${capitalize(event)}`);
      if (!name) return;
      const action = addAction(name);
      setTrigger(node.id, event, action.id);
      setCurrentAction(action.id);
    } else {
      setTrigger(node.id, event, actionId || null);
    }
  }

  function move(delta: -1 | 1): void {
    if (!parentInfo) return;
    const next = Math.max(0, Math.min(parentInfo.parent.children.length - 1, parentInfo.index + delta));
    if (next === parentInfo.index) return;
    moveComponent(node.id, parentInfo.parent.id, next);
  }

  function resetSize(): void {
    setStaticProp(node.id, "__width", "auto");
    setStaticProp(node.id, "__height", "auto");
  }

  return (
    <div className="inspector">
      <div className="inspector-section">
        <div className="inspector-section-head">
          <span className="inspector-cls-pill">{spec.label}</span>
          {isRoot && <span className="inspector-root-badge">Page root</span>}
        </div>
        <div className="inspector-id" onClick={copyId} title="Click to copy">
          {node.id}
        </div>
        {!isRoot && (
          <div className="inline-form-row" style={{ marginTop: 4 }}>
            <button className="ghost icon" onClick={() => move(-1)} title="Move earlier">▲</button>
            <button className="ghost icon" onClick={() => move(1)} title="Move later">▼</button>
            <button className="ghost" onClick={resetSize} title="Reset size to auto">Auto-size</button>
            <button className="danger" onClick={() => removeComponent(node.id)}>Delete</button>
          </div>
        )}
      </div>

      {isContainer && <ArrangementSection layout={node.layout} onChange={(l) => setLayout(node.id, l)} />}

      {!isRoot && <PositioningSection node={node} onChange={(k, v) => setStaticProp(node.id, k, v)} />}

      {spec.staticProps.length > 0 && (
        <div className="inspector-section">
          <div className="inspector-label">Style</div>
          {spec.staticProps.map((prop) => (
            <div className="field-row" key={prop.name}>
              <label>{prop.label}</label>
              <PropInput
                type={prop.type}
                value={node.staticProps[prop.name] ?? prop.default}
                onChange={(v) => setStaticProp(node.id, prop.name, v)}
              />
            </div>
          ))}
        </div>
      )}

      {spec.variableProps.length > 0 && (
        <div className="inspector-section">
          <div className="inspector-label">Content</div>
          {spec.variableProps.map((prop) => (
            <div className="field-row" key={prop.name}>
              <label>{prop.label}</label>
              <PropInput
                type={prop.type}
                value={node.variableProps[prop.name] ?? prop.default}
                onChange={(v) => setVariableProp(node.id, prop.name, v)}
              />
            </div>
          ))}
        </div>
      )}

      {spec.triggers.length > 0 && (
        <div className="inspector-section">
          <div className="inspector-label">When user…</div>
          {spec.triggers.map((trig) => (
            <div className="trigger-row" key={trig.event}>
              <span className="trigger-event">{trig.event}</span>
              <select
                value={node.triggers[trig.event] ?? ""}
                onChange={(e) => handleTrigger(trig.event, e.target.value)}
                style={{ flex: 1, fontSize: 11 }}
              >
                <option value="">— do nothing —</option>
                {actions.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
                <option value="__new__">+ New action…</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Arrangement (was "Layout") ─────────────────────────────────────────────

function ArrangementSection({ layout, onChange }: { layout: Layout; onChange: (l: Layout) => void }) {
  const mode = modeOf(layout);

  function setMode(m: StackMode): void {
    if (m === "vertical") onChange({ kind: "flex", direction: "column", gap: 8, align: "stretch", justify: "flex-start" });
    else if (m === "horizontal") onChange({ kind: "flex", direction: "row", gap: 8, align: "stretch", justify: "flex-start" });
    else onChange({ kind: "grid", columns: 2, gap: 8 });
  }

  return (
    <div className="inspector-section">
      <div className="inspector-label">Arrangement</div>

      <div className="seg-control">
        <button className={mode === "vertical" ? "active" : ""} onClick={() => setMode("vertical")} title="Stack children vertically">
          ☰ Stack
        </button>
        <button className={mode === "horizontal" ? "active" : ""} onClick={() => setMode("horizontal")} title="Place children side by side">
          ⫼ Row
        </button>
        <button className={mode === "grid" ? "active" : ""} onClick={() => setMode("grid")} title="Arrange children in a grid">
          ⊞ Grid
        </button>
      </div>

      {layout.kind === "flex" ? (
        <>
          <div className="field-row">
            <label>Spacing</label>
            <input
              type="number"
              min={0}
              value={layout.gap}
              onChange={(e) => onChange({ ...layout, gap: Math.max(0, Number(e.target.value)) })}
            />
            <span className="muted" style={{ fontSize: 10 }}>px</span>
          </div>

          <div className="field-row">
            <label>Distribute</label>
            <select
              value={layout.justify}
              onChange={(e) => onChange({ ...layout, justify: e.target.value })}
            >
              {DISTRIBUTE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="field-row">
            <label>Align</label>
            <select
              value={layout.align}
              onChange={(e) => onChange({ ...layout, align: e.target.value })}
            >
              {ALIGN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <>
          <div className="field-row">
            <label>Columns</label>
            <input
              type="number"
              min={1}
              value={layout.columns}
              onChange={(e) => onChange({ ...layout, columns: Math.max(1, Number(e.target.value)) })}
            />
          </div>
          <div className="field-row">
            <label>Spacing</label>
            <input
              type="number"
              min={0}
              value={layout.gap}
              onChange={(e) => onChange({ ...layout, gap: Math.max(0, Number(e.target.value)) })}
            />
            <span className="muted" style={{ fontSize: 10 }}>px</span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Positioning (was "Sizing") ─────────────────────────────────────────────

function PositioningSection({
  node, onChange,
}: { node: ComponentNode; onChange: (key: string, value: JSONValue) => void }) {
  const stretch = node.staticProps["__grow"];
  const align = node.staticProps["__alignSelf"];

  return (
    <div className="inspector-section">
      <div className="inspector-label">Size & position</div>

      <div className="field-row">
        <label>Width</label>
        <SizeInput value={node.staticProps["__width"]} onChange={(v) => onChange("__width", v)} />
      </div>
      <div className="field-row">
        <label>Height</label>
        <SizeInput value={node.staticProps["__height"]} onChange={(v) => onChange("__height", v)} />
      </div>
      <div className="field-row">
        <label>Stretch</label>
        <input
          type="range"
          min={0}
          max={4}
          step={1}
          value={typeof stretch === "number" ? stretch : 0}
          onChange={(e) => onChange("__grow", Number(e.target.value))}
        />
        <span className="muted" style={{ fontSize: 11, width: 18, textAlign: "right" }}>
          {typeof stretch === "number" ? stretch : 0}
        </span>
      </div>
      <div className="field-row">
        <label>Anchor</label>
        <select
          value={typeof align === "string" ? align : ""}
          onChange={(e) => onChange("__alignSelf", e.target.value)}
        >
          <option value="">— inherit from parent —</option>
          <option value="flex-start">Top / Left</option>
          <option value="center">Middle</option>
          <option value="flex-end">Bottom / Right</option>
          <option value="stretch">Fill</option>
        </select>
      </div>
      <div className="hint-box">
        Tip: drag the handles on the canvas to resize. Hold <kbd>Shift</kbd> for 1px precision.
      </div>
    </div>
  );
}

function SizeInput({ value, onChange }: { value: JSONValue | undefined; onChange: (v: JSONValue) => void }) {
  const mode = value === "fill" ? "fill" : value === "auto" || value === undefined ? "auto" : "px";
  return (
    <div style={{ display: "flex", gap: 4, flex: 1 }}>
      <select
        value={mode}
        onChange={(e) => {
          const m = e.target.value;
          if (m === "auto") onChange("auto");
          else if (m === "fill") onChange("fill");
          else onChange(120);
        }}
        style={{ flex: "0 0 92px" }}
      >
        <option value="auto">Hug content</option>
        <option value="fill">Fill space</option>
        <option value="px">Fixed px</option>
      </select>
      {mode === "px" && (
        <input
          type="number"
          min={0}
          value={typeof value === "number" ? value : 0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          style={{ flex: 1 }}
        />
      )}
    </div>
  );
}

// ── Generic prop editor ─────────────────────────────────────────────────────

interface PropInputProps {
  type: "string" | "number" | "boolean" | "string[]";
  value: JSONValue;
  onChange: (v: JSONValue) => void;
}

function PropInput({ type, value, onChange }: PropInputProps) {
  if (type === "boolean") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }
  if (type === "number") {
    return (
      <input
        type="number"
        value={String(value ?? "")}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }
  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function findParent(root: ComponentNode, id: string): { parent: ComponentNode; index: number } | null {
  for (let i = 0; i < root.children.length; i++) {
    if (root.children[i].id === id) return { parent: root, index: i };
    const sub = findParent(root.children[i], id);
    if (sub) return sub;
  }
  return null;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
