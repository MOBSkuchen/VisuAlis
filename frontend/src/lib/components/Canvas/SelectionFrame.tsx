import { useEffect, useRef, useState } from "react";
import { useStore } from "../../store";
import { useZoom } from "./Frame";

// Selection chrome: 8 resize handles + live size badge. Mounts inside the
// selected .design-component (which is position: relative). The frame itself
// does not capture pointer events; only the handles do.

type Dir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const DIRS: Dir[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

interface Props {
  nodeId: string;
}

export function SelectionFrame({ nodeId }: Props) {
  const setStaticProp = useStore((s) => s.setStaticProp);
  const wrapRef = useRef<HTMLDivElement>(null);
  const zoom = useZoom();
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [resizing, setResizing] = useState(false);

  // Track the host (the .design-component) live so the badge stays accurate
  // through layout reflows triggered by store mutations.
  useEffect(() => {
    const host = wrapRef.current?.parentElement;
    if (!host) return;
    const update = (): void => {
      const r = host.getBoundingClientRect();
      // r is in screen px and the frame is scaled by `zoom`; divide back out.
      setSize({ w: Math.round(r.width / zoom), h: Math.round(r.height / zoom) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(host);
    return () => ro.disconnect();
  }, [zoom, nodeId]);

  function startResize(dir: Dir, ev: React.MouseEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    const host = wrapRef.current?.parentElement;
    if (!host) return;
    const r = host.getBoundingClientRect();
    const startW = r.width / zoom;
    const startH = r.height / zoom;
    const startX = ev.clientX;
    const startY = ev.clientY;
    setResizing(true);

    function onMove(e: MouseEvent): void {
      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;
      let w = startW;
      let h = startH;
      if (dir.includes("e")) w = startW + dx;
      if (dir.includes("w")) w = startW - dx;
      if (dir.includes("s")) h = startH + dy;
      if (dir.includes("n")) h = startH - dy;
      const snap = e.shiftKey ? 1 : 4;
      w = Math.max(8, Math.round(w / snap) * snap);
      h = Math.max(8, Math.round(h / snap) * snap);
      if (dir.includes("e") || dir.includes("w")) setStaticProp(nodeId, "__width", w);
      if (dir.includes("n") || dir.includes("s")) setStaticProp(nodeId, "__height", h);
    }
    function onUp(): void {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setResizing(false);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const handleScale = Math.max(0.5, Math.min(2.5, 1 / zoom));

  return (
    <div
      ref={wrapRef}
      className={`selection-frame ${resizing ? "resizing" : ""}`}
      style={{ "--handle-scale": handleScale } as React.CSSProperties}
    >
      {DIRS.map((d) => (
        <div
          key={d}
          className={`resize-handle r-${d}`}
          onMouseDown={(e) => startResize(d, e)}
        />
      ))}
      <div className="size-badge">
        {size.w} × {size.h}
      </div>
    </div>
  );
}
