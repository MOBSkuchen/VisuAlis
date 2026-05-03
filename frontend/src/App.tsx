import { Routes, Route, Navigate } from "react-router-dom";
import { ReactFlowProvider } from "@xyflow/react";
import Toolbar from "./lib/components/Toolbar";
import Palette from "./lib/components/Palette";
import { DesignCanvas } from "./lib/components/Canvas/DesignCanvas";
import { FlowCanvas } from "./lib/components/Canvas/FlowCanvas";
import { Inspector } from "./lib/components/Inspector/Inspector";
import { useStore } from "./lib/store";

// Register all design-time component specs on load
import "./lib/components/components/ContainerC";
import "./lib/components/components/TextInputC";
import "./lib/components/components/FileUploadC";
import "./lib/components/components/DropdownC";
import "./lib/components/components/CheckboxC";
import "./lib/components/components/StaticTextC";
import "./lib/components/components/VideoC";
import "./lib/components/components/TableC";
import "./lib/components/components/ButtonC";

function EditorShell() {
  const currentActionId = useStore((s) => s.currentActionId);

  return (
    <div className="app">
      <Toolbar />
      <div className="app-body">
        <Palette />
        <div className="canvas-area">
          {currentActionId ? (
            <ReactFlowProvider>
              <FlowCanvas />
            </ReactFlowProvider>
          ) : (
            <DesignCanvas />
          )}
        </div>
        <Inspector />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/editor/*" element={<EditorShell />} />
      <Route path="*" element={<Navigate to="/editor" replace />} />
    </Routes>
  );
}
