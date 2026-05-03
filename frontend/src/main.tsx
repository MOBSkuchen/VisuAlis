import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@xyflow/react/dist/style.css";
import "./app.css";
import App from "./App";
import { initFromBackend } from "./lib/store";

const target = document.getElementById("app");
if (!target) throw new Error("#app not found");

void initFromBackend();

createRoot(target).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
