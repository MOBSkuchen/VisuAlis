// CSS translation for ComponentNode layout + per-child sizing.
// Centralised so DesignCanvas and component renderers stay in sync,
// and so the compiler emit step has a single reference for the rules.

import type { CSSProperties } from "react";
import type { ComponentNode, JSONValue, Layout } from "../../types";

// ── Container layout ────────────────────────────────────────────────────────

export function layoutToCSS(layout: Layout): CSSProperties {
  if (layout.kind === "flex") {
    return {
      display: "flex",
      flexDirection: layout.direction,
      gap: layout.gap,
      alignItems: layout.align,
      justifyContent: layout.justify,
      flexWrap: "nowrap",
    };
  }
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
    gap: layout.gap,
  };
}

// ── Per-child sizing (lives in staticProps under `__` keys) ─────────────────
//
// Reserved keys, all optional:
//   __grow      number  flex-grow factor
//   __basis     number  flex-basis in px (with grow this acts as a min size)
//   __width     number | "auto" | "fill"   width in px, or auto, or fill (100%)
//   __height    number | "auto" | "fill"
//   __alignSelf string   stretch | flex-start | center | flex-end | baseline
//
// Buffers manage their own grow/basis internally. For everything else these
// keys give users freedom of positioning inside flex without absolute coords.

const SIZING_KEYS = ["__grow", "__basis", "__width", "__height", "__alignSelf"] as const;
export type SizingKey = (typeof SIZING_KEYS)[number];
export const SIZING_KEY_LIST: readonly SizingKey[] = SIZING_KEYS;

export function sizingToCSS(node: ComponentNode): CSSProperties {
  const s = node.staticProps;
  const out: CSSProperties = {};

  const grow = numOrUndef(s["__grow"]);
  const basis = numOrUndef(s["__basis"]);
  if (grow !== undefined || basis !== undefined) {
    out.flex = `${grow ?? 0} 0 ${basis ?? 0}px`;
  }

  const w = sizeValue(s["__width"]);
  if (w !== undefined) out.width = w;
  const h = sizeValue(s["__height"]);
  if (h !== undefined) out.height = h;

  const align = strOrUndef(s["__alignSelf"]);
  if (align) out.alignSelf = align;

  return out;
}

function numOrUndef(v: JSONValue | undefined): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return undefined;
}

function strOrUndef(v: JSONValue | undefined): string | undefined {
  if (typeof v === "string" && v.length > 0) return v;
  return undefined;
}

function sizeValue(v: JSONValue | undefined): string | number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v === "fill") return "100%";
  if (v === "auto") return "auto";
  return undefined;
}
