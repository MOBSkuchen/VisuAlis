import { registerComponent } from "../../registry";

registerComponent({
  cls: "dropdown",
  tag: "select",
  label: "Dropdown",
  staticProps: [
    { name: "options", label: "Options (comma-sep)", type: "string", default: "Option 1,Option 2" },
  ],
  variableProps: [
    { name: "value", label: "Value", type: "string", default: "" },
    { name: "disabled", label: "Disabled", type: "boolean", default: false },
  ],
  triggers: [{ event: "onChange", label: "On change" }],
  render(node) {
    const optStr = String(node.staticProps["options"] ?? "");
    const opts = optStr.split(",").map((o) => o.trim()).filter(Boolean);
    return (
      <select
        disabled={Boolean(node.variableProps["disabled"])}
        style={{ width: "100%", pointerEvents: "none" }}
      >
        {opts.map((o) => <option key={o}>{o}</option>)}
      </select>
    );
  },
});
