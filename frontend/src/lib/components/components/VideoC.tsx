import { registerComponent } from "../../registry";

registerComponent({
  cls: "video",
  tag: "video",
  label: "Video",
  staticProps: [
    { name: "src", label: "Source URL", type: "string", default: "" },
    { name: "controls", label: "Controls", type: "boolean", default: true },
    { name: "loop", label: "Loop", type: "boolean", default: false },
  ],
  variableProps: [
    { name: "playing", label: "Playing", type: "boolean", default: false },
  ],
  triggers: [
    { event: "onPlay", label: "On play" },
    { event: "onPause", label: "On pause" },
    { event: "onEnded", label: "On ended" },
  ],
  render(node) {
    return (
      <video
        src={String(node.staticProps["src"] ?? "")}
        controls={Boolean(node.staticProps["controls"])}
        loop={Boolean(node.staticProps["loop"])}
        style={{ maxWidth: "100%", pointerEvents: "none" }}
      />
    );
  },
});
