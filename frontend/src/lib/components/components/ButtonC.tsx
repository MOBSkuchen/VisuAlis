import { registerComponent } from "../../registry";

registerComponent({
  cls: "button",
  tag: "button",
  label: "Button",
  staticProps: [
    { name: "label", label: "Label", type: "string", default: "Button" },
  ],
  variableProps: [
    { name: "disabled", label: "Disabled", type: "boolean", default: false },
  ],
  triggers: [{ event: "onClick", label: "On click" }],
  render(node) {
    return (
      <button
        disabled={Boolean(node.variableProps["disabled"])}
        style={{ pointerEvents: "none" }}
      >
        {String(node.staticProps["label"] ?? "Button")}
      </button>
    );
  },
});
