import { registerComponent } from "../../registry";

registerComponent({
  cls: "text_input",
  tag: "input",
  label: "Text Input",
  staticProps: [
    { name: "placeholder", label: "Placeholder", type: "string", default: "" },
    { name: "inputType", label: "Type", type: "options", default: "text,password" },
  ],
  variableProps: [
    { name: "value", label: "Value", type: "string", default: "" },
    { name: "disabled", label: "Disabled", type: "boolean", default: false },
  ],
  triggers: [
    { event: "onChange", label: "On change" },
    { event: "onBlur", label: "On blur" },
  ],
  render(node) {
    return (
      <input
        type={String(node.staticProps["inputType"] ?? "text")}
        placeholder={String(node.staticProps["placeholder"] ?? "")}
        defaultValue={String(node.variableProps["value"] ?? "")}
        disabled={Boolean(node.variableProps["disabled"])}
        readOnly
        style={{ width: "100%", pointerEvents: "none" }}
      />
    );
  },
});
