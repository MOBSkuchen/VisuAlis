import { registerComponent } from "../../registry";

registerComponent({
  cls: "checkbox",
  tag: "input",
  label: "Checkbox",
  staticProps: [
    { name: "label", label: "Label", type: "string", default: "Checkbox" },
  ],
  variableProps: [
    { name: "checked", label: "Checked", type: "boolean", default: false },
    { name: "disabled", label: "Disabled", type: "boolean", default: false },
  ],
  triggers: [{ event: "onChange", label: "On change" }],
  render(node) {
    return (
      <label style={{ display: "flex", alignItems: "center", gap: 6, pointerEvents: "none" }}>
        <input
          type="checkbox"
          defaultChecked={Boolean(node.variableProps["checked"])}
          disabled={Boolean(node.variableProps["disabled"])}
          readOnly
        />
        {String(node.staticProps["label"] ?? "Checkbox")}
      </label>
    );
  },
});
