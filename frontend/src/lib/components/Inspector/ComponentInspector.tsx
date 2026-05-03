import type { ComponentNode, JSONValue } from "../../types";
import { useStore } from "../../store";
import { getSpec } from "../../registry";

interface Props { node: ComponentNode }

export function ComponentInspector({ node }: Props) {
  const setStaticProp = useStore((s) => s.setStaticProp);
  const setVariableProp = useStore((s) => s.setVariableProp);
  const setTrigger = useStore((s) => s.setTrigger);
  const actions = useStore((s) => s.project.actions);
  const addAction = useStore((s) => s.addAction);
  const setCurrentAction = useStore((s) => s.setCurrentAction);

  const spec = getSpec(node.cls);

  function copyId() {
    void navigator.clipboard.writeText(node.id);
  }

  function handleTrigger(event: string, actionId: string) {
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

  return (
    <div className="inspector">
      <div className="inspector-section">
        <div className="inspector-label">ID</div>
        <div className="inspector-id" onClick={copyId} title="Click to copy">
          {node.id}
        </div>
      </div>

      {spec.staticProps.length > 0 && (
        <div className="inspector-section">
          <div className="inspector-label">Static props</div>
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
          <div className="inspector-label">Variable props (defaults)</div>
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
          <div className="inspector-label">Triggers</div>
          {spec.triggers.map((trig) => (
            <div className="trigger-row" key={trig.event}>
              <span className="trigger-event">{trig.event}</span>
              <select
                value={node.triggers[trig.event] ?? ""}
                onChange={(e) => handleTrigger(trig.event, e.target.value)}
                style={{ flex: 1, fontSize: 11 }}
              >
                <option value="">— none —</option>
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
