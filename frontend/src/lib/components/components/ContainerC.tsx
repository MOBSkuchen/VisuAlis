import { registerComponent } from "../../registry";

registerComponent({
  cls: "container",
  tag: "div",
  label: "Container",
  staticProps: [
    { name: "padding", label: "Padding", type: "number", default: 8 },
    { name: "bg", label: "Background", type: "string", default: "" },
  ],
  variableProps: [],
  triggers: [],
  render(node, _ctx) {
    const { layout, staticProps } = node;
    const style: React.CSSProperties = {
      display: layout.kind === "flex" ? "flex" : "grid",
      flexDirection: layout.kind === "flex" && layout.direction === "row" ? "row" : "column",
      gap: layout.gap ?? 8,
      gridTemplateColumns: layout.kind === "grid" ? `repeat(${layout.columns}, 1fr)` : undefined,
      padding: Number(staticProps["padding"] ?? 8),
      background: String(staticProps["bg"] ?? "transparent"),
      minHeight: 40,
      width: "100%",
    };
    return <div style={style} />;
  },
});
