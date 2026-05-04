import { registerComponent } from "../../registry";

// Buffer = invisible spacer. In flex containers, `grow > 0` makes it absorb free
// space (the "push other items" use case). Otherwise it has a fixed size in the
// container's main axis. Renders as visible-but-faded only inside the designer
// (handled by ComponentTree's outline); the actual element is invisible at runtime.
registerComponent({
  cls: "buffer",
  tag: "div",
  label: "Buffer",
  staticProps: [
    { name: "grow", label: "Grow", type: "number", default: 1 },
    { name: "size", label: "Min size (px)", type: "number", default: 16 },
  ],
  variableProps: [],
  triggers: [],
  render(node) {
    const grow = Number(node.staticProps["grow"] ?? 1);
    const size = Number(node.staticProps["size"] ?? 16);
    return (
      <div
        style={{
          flex: grow > 0 ? `${grow} 0 ${size}px` : `0 0 ${size}px`,
          alignSelf: "stretch",
          minWidth: size,
          minHeight: size,
          pointerEvents: "none",
        }}
        aria-hidden
      />
    );
  },
});
