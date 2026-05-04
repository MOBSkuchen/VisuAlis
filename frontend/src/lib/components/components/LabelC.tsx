import { registerComponent } from "../../registry";

registerComponent({
  cls: "label",
  tag: "span",
  label: "Label",
  staticProps: [
    { name: "size", label: "Font size", type: "number", default: 13 },
    { name: "weight", label: "Weight", type: "number", default: 400 },
    { name: "color", label: "Color", type: "string", default: "" },
  ],
  variableProps: [
    { name: "text", label: "Text", type: "string", default: "Label" },
  ],
  triggers: [],
  render(node) {
    const text = String(node.variableProps["text"] ?? "");
    const size = Number(node.staticProps["size"] ?? 13);
    const weight = Number(node.staticProps["weight"] ?? 400);
    const color = String(node.staticProps["color"] ?? "");
    return (
      <span
        style={{
          display: "inline-block",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontSize: size,
          fontWeight: weight,
          color: color || undefined,
          pointerEvents: "none",
          maxWidth: "100%",
        }}
      >
        {text}
      </span>
    );
  },
});
