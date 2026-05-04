import { useStore } from "../store";
import { api } from "../api";

export default function Toolbar() {
  const name = useStore((s) => s.project.name);
  const setProjectName = useStore((s) => s.setProjectName);
  const saveStatus = useStore((s) => s.saveStatus);
  const project = useStore((s) => s.project);
  const currentActionId = useStore((s) => s.currentActionId);
  const setCurrentAction = useStore((s) => s.setCurrentAction);

  async function handleCompile() {
    try {
      const blob = await api.compile(project.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Compile failed: ${String(e)}`);
    }
  }

  const statusLabel =
    saveStatus === "saving"
      ? "Saving"
      : saveStatus === "error"
        ? "Save failed"
        : saveStatus === "saved"
          ? "Saved"
          : "Idle";

  return (
    <div className="toolbar">
      <div className="toolbar-brand">
        <span className="toolbar-brand-dot" />
        VisuAlis
      </div>
      <div className="toolbar-divider" />
      <input
        className="toolbar-name"
        value={name}
        onChange={(e) => setProjectName(e.target.value)}
        spellCheck={false}
        aria-label="Project name"
      />

      {currentActionId && (
        <button className="ghost" onClick={() => setCurrentAction(null)}>
          ← Back to canvas
        </button>
      )}

      <div className="toolbar-gap" />

      <span className={`save-status ${saveStatus}`}>{statusLabel}</span>

      <button className="primary" onClick={() => void handleCompile()}>
        Compile ↓
      </button>
    </div>
  );
}
