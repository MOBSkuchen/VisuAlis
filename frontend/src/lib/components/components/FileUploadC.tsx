import { registerComponent } from "../../registry";

registerComponent({
  cls: "file_upload",
  tag: "input",
  label: "File Upload",
  staticProps: [
    { name: "accept", label: "Accept", type: "string", default: "*" },
    { name: "multiple", label: "Multiple", type: "boolean", default: false },
  ],
  variableProps: [],
  triggers: [{ event: "onChange", label: "On change" }],
  render(node) {
    return (
      <input
        type="file"
        accept={String(node.staticProps["accept"] ?? "*")}
        multiple={Boolean(node.staticProps["multiple"])}
        style={{ pointerEvents: "none" }}
      />
    );
  },
});
