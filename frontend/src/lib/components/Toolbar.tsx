import { useStore } from "../store";
import { api } from "../api";

export default function Toolbar() {
  const name = useStore((s) => s.project.name);
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
      ? "Saving…"
      : saveStatus === "error"
        ? "Save failed"
        : saveStatus === "saved"
          ? "Saved"
          : "";

  return (
    <div className="toolbar">
      <h1>VisuAlis</h1>
      <span className="muted">—</span>
      <span style={{ fontSize: 12 }}>{name}</span>

      {currentActionId && (
        <button onClick={() => setCurrentAction(null)}>← Back to canvas</button>
      )}

      <div className="toolbar-gap" />

      {statusLabel && (
        <span className={`save-status ${saveStatus}`}>{statusLabel}</span>
      )}

      <button className="primary" onClick={() => void handleCompile()}>
        Compile ↓
      </button>
    </div>
  );
}
