import { useState } from "react";
import { useStore } from "../store";

export function ActionList() {
  const actions = useStore((s) => s.project.actions);
  const currentActionId = useStore((s) => s.currentActionId);
  const setCurrentAction = useStore((s) => s.setCurrentAction);
  const addAction = useStore((s) => s.addAction);
  const removeAction = useStore((s) => s.removeAction);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("myAction");

  function commit() {
    if (!name.trim()) return;
    const action = addAction(name.trim());
    setCurrentAction(action.id);
    setAdding(false);
    setName("myAction");
  }

  return (
    <div>
      {actions.length === 0 && !adding && (
        <div className="empty-hint">No actions yet</div>
      )}
      {actions.map((action) => (
        <div
          key={action.id}
          className={`list-item ${action.id === currentActionId ? "active" : ""}`}
          onClick={() => setCurrentAction(action.id)}
        >
          <div className="list-item-content">
            <div className="list-item-label">{action.name}</div>
          </div>
          <button
            className="danger icon"
            onClick={(e) => { e.stopPropagation(); removeAction(action.id); }}
            title="Delete action"
          >
            ✕
          </button>
        </div>
      ))}

      {adding ? (
        <div className="inline-form">
          <input
            placeholder="actionName"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setAdding(false); }}
          />
          <div className="inline-form-row">
            <button className="ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button className="primary" onClick={commit}>Add</button>
          </div>
        </div>
      ) : (
        <button className="add-btn" onClick={() => setAdding(true)}>+ Add action</button>
      )}
    </div>
  );
}
