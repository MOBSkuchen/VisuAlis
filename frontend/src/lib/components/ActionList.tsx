import { useStore } from "../store";

export function ActionList() {
  const actions = useStore((s) => s.project.actions);
  const currentActionId = useStore((s) => s.currentActionId);
  const setCurrentAction = useStore((s) => s.setCurrentAction);
  const addAction = useStore((s) => s.addAction);
  const removeAction = useStore((s) => s.removeAction);

  function handleAdd() {
    const name = prompt("Action name:", "myAction");
    if (!name) return;
    const action = addAction(name);
    setCurrentAction(action.id);
  }

  return (
    <div>
      {actions.map((action) => (
        <div
          key={action.id}
          className={`list-item ${action.id === currentActionId ? "active" : ""}`}
          onClick={() => setCurrentAction(action.id)}
        >
          <div className="list-item-label">{action.name}</div>
          <button
            className="danger"
            style={{ padding: "2px 6px", fontSize: 10 }}
            onClick={(e) => { e.stopPropagation(); removeAction(action.id); }}
          >
            ✕
          </button>
        </div>
      ))}
      <button className="add-btn" onClick={handleAdd}>+ Add action</button>
    </div>
  );
}
