import { registerComponent } from "../../registry";

registerComponent({
  cls: "static_text",
  tag: "p",
  label: "Static Text",
  staticProps: [
    { name: "level", label: "Level (p/h1-h6)", type: "string", default: "p" },
  ],
  variableProps: [
    { name: "text", label: "Text", type: "string", default: "Hello" },
  ],
  triggers: [],
  render(node) {
    const level = String(node.staticProps["level"] ?? "p");
    const text = String(node.variableProps["text"] ?? "");
    const Tag = level as keyof JSX.IntrinsicElements;
    return <Tag style={{ pointerEvents: "none" }}>{text}</Tag>;
  },
});
