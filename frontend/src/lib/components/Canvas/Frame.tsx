import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// Fixed-pixel design surface. Compiled output renders identically on every
// screen, so the design size is canonical (not responsive). The viewport
// only zooms/pans for the designer's convenience.

export const FRAME_WIDTH = 1280;
export const FRAME_HEIGHT = 800;

// Tree consumers (resize handles, drag math) read this to convert screen
// pixel deltas into design pixels.
const ZoomContext = createContext<number>(1);
export function useZoom(): number { return useContext(ZoomContext); }

interface Props {
  children: ReactNode;
}

export function Frame({ children }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panning = useRef<{ x: number; y: number } | null>(null);

  // Fit canvas on first mount; re-center (without re-zooming) on resize.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const z = Math.min((r.width - 48) / FRAME_WIDTH, (r.height - 48) / FRAME_HEIGHT, 1.0);
    setZoom(z);
    setPan({ x: (r.width - FRAME_WIDTH * z) / 2, y: (r.height - FRAME_HEIGHT * z) / 2 });
    const ro = new ResizeObserver(() => {
      setZoom((curZ) => {
        const rect = el.getBoundingClientRect();
        setPan({ x: (rect.width - FRAME_WIDTH * curZ) / 2, y: (rect.height - FRAME_HEIGHT * curZ) / 2 });
        return curZ;
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function onWheel(e: React.WheelEvent): void {
    e.preventDefault();
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    const factor = Math.exp(-e.deltaY / 400);
    setZoom((z) => {
      const next = Math.max(0.2, Math.min(2, z * factor));
      const k = next / z;
      setPan((p) => ({ x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k }));
      return next;
    });
  }

  function onMouseDown(e: React.MouseEvent): void {
    // Middle-mouse OR space-held + left-mouse pans. Space is checked at handler
    // creation time via document.activeElement keyboard tracking below.
    if (e.button === 1 || (e.button === 0 && spaceHeld)) {
      e.preventDefault();
      panning.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  }

  function onMouseMove(e: React.MouseEvent): void {
    if (!panning.current) return;
    setPan({ x: e.clientX - panning.current.x, y: e.clientY - panning.current.y });
  }

  function endPan(): void { panning.current = null; }

  function fitToScreen(): void {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const z = Math.min((r.width - 64) / FRAME_WIDTH, (r.height - 64) / FRAME_HEIGHT, 1);
    setZoom(z);
    setPan({ x: (r.width - FRAME_WIDTH * z) / 2, y: (r.height - FRAME_HEIGHT * z) / 2 });
  }

  function resetZoom(): void {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setZoom(1);
    setPan({ x: (r.width - FRAME_WIDTH) / 2, y: (r.height - FRAME_HEIGHT) / 2 });
  }

  return (
    <div
      ref={wrapRef}
      className={`design-viewport ${spaceHeld ? "panning" : ""}`}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endPan}
      onMouseLeave={endPan}
    >
      <div
        className="design-frame"
        style={{
          width: FRAME_WIDTH,
          height: FRAME_HEIGHT,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        <ZoomContext.Provider value={zoom}>{children}</ZoomContext.Provider>
      </div>

      <div className="design-zoom-bar">
        <button className="ghost icon" onClick={() => setZoom((z) => Math.max(0.2, z * 0.85))}>−</button>
        <span className="design-zoom-value">{Math.round(zoom * 100)}%</span>
        <button className="ghost icon" onClick={() => setZoom((z) => Math.min(2, z * 1.15))}>+</button>
        <div className="toolbar-divider" />
        <button className="ghost" onClick={fitToScreen}>Fit</button>
        <button className="ghost" onClick={resetZoom}>100%</button>
      </div>

      <div className="design-hint">scroll to zoom · Space + drag to pan · Shift for 1 px snapping</div>
    </div>
  );
}

// Track Space key globally without forcing every consumer to wire focus.
let spaceHeld = false;
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !isTextTarget(e.target)) {
      e.preventDefault();
      spaceHeld = true;
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") spaceHeld = false;
  });
  window.addEventListener("blur", () => { spaceHeld = false; });
}

function isTextTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
}
