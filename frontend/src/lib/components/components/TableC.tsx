import { registerComponent } from "../../registry";

registerComponent({
  cls: "table",
  tag: "table",
  label: "Table",
  staticProps: [
    { name: "columns", label: "Columns (comma-sep)", type: "string", default: "Name,Value" },
  ],
  variableProps: [
    { name: "rows", label: "Rows (JSON)", type: "string", default: "[]" },
  ],
  triggers: [{ event: "onRowClick", label: "On row click" }],
  render(node) {
    const cols = String(node.staticProps["columns"] ?? "").split(",").map((c) => c.trim());
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", pointerEvents: "none", fontSize: 12 }}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid var(--border)", color: "var(--fg-2)" }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {cols.map((c) => (
              <td key={c} style={{ padding: "4px 8px", color: "var(--fg-2)" }}>—</td>
            ))}
          </tr>
        </tbody>
      </table>
    );
  },
});
